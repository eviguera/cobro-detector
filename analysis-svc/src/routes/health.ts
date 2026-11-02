import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'

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

    // 2. Verificar que GROQ_API_KEY esté configurada (no llamamos a Groq para evitar costo/latencia)
    checks.groq = process.env.GROQ_API_KEY ? 'ok' : 'misconfigured'
    if (!process.env.GROQ_API_KEY) overall = 'degraded'

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
