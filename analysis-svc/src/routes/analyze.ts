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

    const { data, error } = await userSupabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'Analysis not found' })
    }

    // El analisis debe pertenecer al usuario del token.
    if (request.authUser.id !== data.user_id) {
      return reply.status(403).send({ error: 'Forbidden: resource belongs to another user' })
    }
    return reply.send(data)
  })

  app.post('/v1/analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = analyzeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    const { analysisId } = parsed.data

    const token = extractBearerToken(request)!
    const userSupabase = createUserClient(token)

    const { data: analysis, error } = await userSupabase
      .from('analyses')
      .select('*, storage_path, encryption_key_iv, encryption_key_base64')
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

    await queue.enqueue(job)

    return reply.status(202).send({
      analysisId,
      status: 'queued',
      message: 'El análisis se está procesando en segundo plano. Consulte el historial para ver el resultado.',
    })
  })
}
