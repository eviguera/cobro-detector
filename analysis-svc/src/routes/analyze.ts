import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { createUserClient } from '../infrastructure/adapters/supabase-user-client.js'
import { extractBearerToken } from '../security/supabase-jwt.js'
import { requireAuth, requireSelfOr403 } from '../security/supabase-jwt.js'
import { InvalidFileUrlError, resolveAllowedFileUrl } from '../security/supabase-url.js'
import { queue } from '../infrastructure/queue-connection.js'
import type { QueueJob } from '../domain/ports/queue.port.js'

const supabase = createServiceClient()

const analyzeSchema = z.object({
  analysisId: z.uuid(),
})

export async function analyzeRoutes(app: FastifyInstance) {
  app.get('/v1/analyses/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    // HARDENED (2026-11): auth ANTES de tocar la DB (sin esto, un 404/403
    // filtraria la existencia de analisis de otros usuarios).
    const okAuth = await requireAuth(request, reply)
    if (!okAuth) return reply

    const token = extractBearerToken(request)!
    const userSupabase = createUserClient(token)

    // El paywall y la ocultación de llaves se aplican en la base
    // (get_analysis_report): el cliente ya no puede leer anomalies/raw_data
    // por PostgREST ni aunque conozca el id.
    const { data, error } = await userSupabase.rpc('get_analysis_report', {
      p_analysis_id: id,
    })

    if (error || !data) {
      return reply.status(404).send({ error: 'Analysis not found' })
    }
    return reply.send(data)
  })

  app.post('/v1/analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = analyzeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    const { analysisId } = parsed.data

    // El cliente ya no puede leer las llaves de cifrado (grants por columna),
    // así que aquí se lee con service role y el ownership se valida explícito.
    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('id, user_id, company_id, plan, status, file_url, file_type, file_name, storage_path, encryption_key_iv, encryption_key_base64')
      .eq('id', analysisId)
      .single()

    if (error || !analysis) {
      return reply.status(404).send({ error: 'Analysis not found' })
    }

    const userId = analysis.user_id as string

    // HARDENED (2026-11): solo se puede ejecutar un análisis propio.
    if (request.authUser.id !== userId) {
      return reply.status(403).send({ error: 'Forbidden: analysis belongs to another user' })
    }

    const fileUrl = analysis.file_url as string
    const fileType = analysis.file_type as string
    const fileName = analysis.file_name as string
    const storagePath = analysis.storage_path as string | null
    const encryptionKeyIv = analysis.encryption_key_iv as string | null
    const encryptionKeyBase64 = analysis.encryption_key_base64 as string | null

    // HARDENED (2026-11): anti-SSRF — validar que fileUrl apunte al Supabase
    // del proyecto y no a una URL externa controlada por el usuario.
    // La misma validación se aplica en el worker, con la diferencia de que aquí
    // se resuelve la URL alcanzable desde el contenedor (ver supabase-url.ts).
    let resolvedFileUrl: string
    try {
      resolvedFileUrl = resolveAllowedFileUrl(fileUrl).toString()
    } catch (error) {
      const message = error instanceof InvalidFileUrlError
        ? error.message
        : 'URL de archivo inválida'
      return reply.status(400).send({ error: message })
    }

    // HARDENED (2026-11): el consumo del crédito se hace en el servidor.
    // Antes solo lo hacía el navegador (submit-analysis.ts), así que llamar a
    // este endpoint directamente permitía análisis gratis ilimitados.
    // El Plan Platino no consume créditos: se cobra el 20% del monto recuperado.
    // El plan lo declara el cliente al crear el registro (`plan`), pero su
    // consecuencia es pagar crédito o quedar con el reporte bloqueado; ninguna
    // de las dos opciones da acceso gratis. `status` ya no lo escribe el cliente.
    const isPlatino = analysis.plan === 'platino'
    const companyId = (analysis.company_id as string | null) ?? null
    let charged = false

    if (!isPlatino) {
      // Cobro idempotente y durable: el flag analyses.credit_consumed_at hace
      // que un reintento del cliente no descuente dos veces.
      const { data: chargeResult, error: creditError } = await supabase.rpc('charge_analysis_credit', {
        p_analysis_id: analysisId,
        p_company_id: companyId,
      })
      if (creditError) {
        request.log.error({ err: creditError, analysisId }, 'charge_analysis_credit failed')
        return reply.status(500).send({ error: 'No se pudo descontar el crédito' })
      }
      if (chargeResult === 'no_credits') {
        return reply.status(402).send({ error: 'Sin créditos disponibles' })
      }
      if (chargeResult === 'already') {
        return reply.status(409).send({ error: 'El análisis ya está en curso' })
      }
      charged = true
    }

    // HARDENED (2026-11): el análisis se ejecuta de forma asíncrona mediante
    // una cola Redis. El endpoint devuelve 202 Accepted inmediatamente y el
    // worker procesa el job en background. El cliente hace polling en
    // GET /v1/analyses/:id hasta que el estado sea completed/awaiting_payment/error.
    const job: QueueJob = {
      userId,
      fileName,
      filePath: resolvedFileUrl,
      fileType,
      companyId: (analysis.company_id as string | null) ?? null,
      analysisId,
      storagePath,
      encryptionKeyIv,
      encryptionKeyBase64,
    }

    try {
      await queue.enqueue(job)
    } catch (enqueueError) {
      // El crédito ya se descontó: si el encolado falla, devolverlo para no
      // cobrar un análisis que nunca se ejecutó. Las acreditaciones por
      // empresa no se pueden revertir con add_credits (solo opera sobre la
      // fila sin company_id), así que se registran para conciliación manual.
      if (charged) {
        const { data: refunded, error: refundError } = await supabase.rpc('refund_analysis_credit', {
          p_analysis_id: analysisId,
        })
        if (refundError || refunded !== true) {
          request.log.error({ err: refundError, userId, analysisId, companyId }, 'No se pudo devolver el crédito')
        }
      }
      request.log.error({ err: enqueueError, analysisId }, 'No se pudo encolar el análisis')
      return reply.status(503).send({ error: 'No se pudo encolar el análisis' })
    }

    return reply.status(202).send({
      analysisId,
      status: 'queued',
      message: 'El análisis se está procesando en segundo plano. Consulte el historial para ver el resultado.',
    })
  })
}
