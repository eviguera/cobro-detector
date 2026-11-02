import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/supabase-client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { service: 'api-svc', version: '1.0.0', endpoints: ['/health', '/v1/verify', '/v1/keys/:userId'] }
  })

  app.get('/health', async (request, reply) => {
    const checks: Record<string, string> = {}
    let overall = 'ok'

    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('api_keys').select('id').limit(1)
      checks.supabase = error ? 'degraded' : 'ok'
      if (error) overall = 'degraded'
    } catch {
      checks.supabase = 'down'
      overall = 'down'
    }

    const statusCode = overall === 'down' ? 503 : 200

    request.log.warn({ checks, overall }, 'Health check')
    return reply.status(statusCode).send({
      status: overall,
      service: 'api-svc',
      timestamp: new Date().toISOString(),
      checks,
    })
  })
}
