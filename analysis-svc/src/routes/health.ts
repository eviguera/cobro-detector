import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { getRedis, getQueue } from '../infrastructure/queue-connection.js'

// El service client es barato de construir pero no hay razón para crear uno
// por request de health (se pinguea cada pocos segundos).
const supabase = createServiceClient()

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    const checks: Record<string, unknown> = {}
    let overall = 'ok'

    // 1. Verificar conexión a Supabase (query ligera)
    try {
      const { error } = await supabase.from('analyses').select('id').limit(1)
      checks.supabase = error ? 'degraded' : 'ok'
      if (error) overall = 'degraded'
    } catch {
      checks.supabase = 'down'
      overall = 'down'
    }

    // 2. Verificar Redis (cola de análisis). Sin Redis no se pueden encolar jobs.
    try {
      const pong = await getRedis().ping()
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

    // 4. Salud de la cola: profundidad pendiente, jobs en procesamiento y
    // muertos (DLQ). Jobs en la DLQ = algo requiere investigación manual, se
    // reporta como degraded para que salte en el monitoreo.
    try {
      const queue = getQueue()
      const [pending, processing, dead] = await Promise.all([
        queue.getLength(),
        queue.getProcessingLength(),
        queue.getDeadLength(),
      ])
      checks.queue = { pending, processing, dead }
      if (dead > 0) overall = 'degraded'
    } catch {
      // Redis ya cubre el estado "down"; aquí solo falta la métrica.
      checks.queue = 'unavailable'
    }

    const statusCode = overall === 'down' ? 503 : 200

    request.log.info({ checks, overall }, 'Health check')
    return reply.status(statusCode).send({
      status: overall,
      service: 'analysis-svc',
      timestamp: new Date().toISOString(),
      checks,
    })
  })
}
