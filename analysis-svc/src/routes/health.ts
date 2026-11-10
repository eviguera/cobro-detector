import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { redis } from '../infrastructure/queue-connection.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    const checks: Record<string, string> = {}
    let overall = 'ok'

    // 1. Verificar conexión a Supabase (query ligera)
    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('analyses').select('id').limit(1)
      checks.supabase = error ? 'degraded' : 'ok'
      if (error) overall = 'degraded'
    } catch {
      checks.supabase = 'down'
      overall = 'down'
    }

    // 2. Verificar Redis (cola de análisis). Sin Redis no se pueden encolar jobs.
    try {
      const pong = await redis.ping()
      checks.redis = pong === 'PONG' ? 'ok' : 'degraded'
      if (pong !== 'PONG') {
        overall = 'down'
      }
    } catch {
      checks.redis = 'down'
      overall = 'down'
    }

    // 3. Groq es una capa opcional: si no está configurada, el motor sigue con
    // reglas determinísticas. No debe marcar el servicio como degradado.
    checks.groq = process.env.GROQ_API_KEY ? 'ok' : 'not_configured'

    const statusCode = overall === 'down' ? 503 : 200

    request.log.warn({ checks, overall }, 'Health check')
    return reply.status(statusCode).send({
      status: overall,
      service: 'analysis-svc',
      timestamp: new Date().toISOString(),
      checks,
    })
  })
}
