import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { ResendEmailAdapter } from '../infrastructure/adapters/resend-email.adapter.js'
import { SupabaseEventRepositoryAdapter } from '../infrastructure/adapters/supabase-event-repository.adapter.js'
import { SendAnalysisNotificationUseCase } from '../application/send-analysis-notification.use-case.js'
import { TrackEventUseCase } from '../application/track-event.use-case.js'
import { requireAuth, requireSelfOr403 } from '../security/supabase-jwt.js'

const supabase = createServiceClient()
const emailSender = new ResendEmailAdapter()
const eventRepo = new SupabaseEventRepositoryAdapter(supabase)
const sendNotification = new SendAnalysisNotificationUseCase(emailSender)
const trackEvent = new TrackEventUseCase(eventRepo)

const notificationSchema = z.object({
  to: z.email(),
  userName: z.string().min(1),
  analysisId: z.uuid(),
  anomaliesCount: z.number().int().nonnegative(),
  recoverableAmount: z.number().nonnegative(),
})

const eventSchema = z.object({
  userId: z.string().nullable(),
  eventType: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export async function notificationRoutes(app: FastifyInstance) {
  app.post('/v1/send-analysis-notification', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = notificationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    // HARDENED (2026-11): solo se puede notificar sobre un análisis propio.
    const { data: analysisRow } = await supabase
      .from('analyses')
      .select('user_id')
      .eq('id', parsed.data.analysisId)
      .single()
    const ok = analysisRow
      ? await requireSelfOr403(request, reply, analysisRow.user_id as string)
      : false
    if (!ok) return reply

    // HARDENED (2026-11 destino siempre el email del JWT (anti-spam con Resend).
    const to = request.authUser.email
    if (!to || !to.includes('@')) {
      return reply.status(400).send({ error: 'No recipient email in session' })
    }
    const sent = await sendNotification.execute({ ...parsed.data, to })

    return reply.send({ sent })
  })

  app.post('/v1/events', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    // HARDENED (2026-11): el evento siempre se atribuye al usuario del token.
    await trackEvent.execute({
      user_id: request.authUser.id,
      event_type: parsed.data.eventType as never,
      metadata: parsed.data.metadata,
    })

    return reply.send({ tracked: true })
  })
}
