import type { FastifyInstance } from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { ResendEmailAdapter } from '../infrastructure/adapters/resend-email.adapter.js'
import {
  buildClaimReminderEmail,
  isReminderDue,
  subtractBusinessDays,
} from '../domain/claim-reminder.js'

const supabase = createServiceClient()
const emailSender = new ResendEmailAdapter()

function safeEqual(a: string, b: string): boolean {
  const first = Buffer.from(a)
  const second = Buffer.from(b)
  if (first.length !== second.length) return false
  return timingSafeEqual(first, second)
}

function authorizeCron(header: unknown): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return typeof header === 'string' && safeEqual(header, secret)
}

interface ClaimRow {
  id: string
  analysis_id: string
  user_id: string
  sent_at: string
  reminder_sent_at: string | null
}

/**
 * Job de recordatorios de reclamo.
 *
 * Lo dispara un cron externo (Vercel Cron, GitHub Actions o un scheduler)
 * con el header `x-cron-secret`. No está protegido por JWT de usuario porque
 * no actúa en nombre de una persona: recorre reclamos vencidos.
 */
export async function claimReminderRoutes(app: FastifyInstance) {
  app.post('/v1/claim-reminders/run', async (request, reply) => {
    if (!process.env.CRON_SECRET) {
      return reply.status(503).send({ error: 'CRON_SECRET no configurado' })
    }
    if (!authorizeCron(request.headers['x-cron-secret'])) {
      return reply.status(401).send({ error: 'No autorizado' })
    }

    const cutoff = subtractBusinessDays(new Date(), 10).toISOString()
    const { data: claims, error } = await supabase
      .from('claim_tracking')
      .select('id, analysis_id, user_id, sent_at, reminder_sent_at')
      .eq('status', 'sent')
      .is('reminder_sent_at', null)
      .lte('sent_at', cutoff)
      .limit(200)

    if (error) {
      request.log.error({ err: error }, 'No se pudieron cargar reclamos vencidos')
      return reply.status(500).send({ error: 'No se pudieron cargar los reclamos' })
    }

    const due = ((claims ?? []) as ClaimRow[]).filter((claim) =>
      isReminderDue(claim.sent_at)
    )

    if (due.length === 0) {
      return reply.send({ checked: claims?.length ?? 0, sent: 0, skipped: 0 })
    }

    const userIds = Array.from(new Set(due.map((claim) => claim.user_id)))
    const analysisIds = Array.from(new Set(due.map((claim) => claim.analysis_id)))

    const [{ data: profiles }, { data: analyses }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').in('id', userIds),
      supabase.from('analyses').select('id, file_name, bank').in('id', analysisIds),
    ])

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
    const analysisById = new Map((analyses ?? []).map((analysis) => [analysis.id, analysis]))

    let sent = 0
    let skipped = 0

    for (const claim of due) {
      const profile = profileById.get(claim.user_id)
      const analysis = analysisById.get(claim.analysis_id)
      const email = profile?.email

      if (!email || !analysis) {
        skipped++
        continue
      }

      const message = buildClaimReminderEmail({
        userName: profile?.full_name ?? 'hola',
        fileName: analysis.file_name,
        bank: analysis.bank,
        analysisId: claim.analysis_id,
      })

      const ok = await emailSender.send({
        to: email,
        subject: message.subject,
        html: message.html,
      })

      if (!ok) {
        skipped++
        continue
      }

      sent++
      await supabase
        .from('claim_tracking')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', claim.id)
    }

    request.log.info({ checked: due.length, sent, skipped }, 'Recordatorios de reclamo procesados')
    return reply.send({ checked: due.length, sent, skipped })
  })
}
