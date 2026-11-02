import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    const checks: Record<string, string> = {}
    let overall = 'ok'

    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('orders').select('id').limit(1)
      checks.supabase = error ? 'degraded' : 'ok'
      if (error) overall = 'degraded'
    } catch {
      checks.supabase = 'down'
      overall = 'down'
    }

    checks.mercadopago = process.env.MERCADOPAGO_ACCESS_TOKEN ? 'ok' : 'misconfigured'
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) overall = 'degraded'

    const statusCode = overall === 'down' ? 503 : 200

    request.log.warn({ checks, overall }, 'Health check')
    return reply.status(statusCode).send({
      status: overall,
      service: 'payment-svc',
      timestamp: new Date().toISOString(),
      checks,
    })
  })
}
