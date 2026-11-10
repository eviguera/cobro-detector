import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    const checks: Record<string, string> = {}
    let overall = 'ok'

    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('orders').select('id').limit(1)
      // Un error de PostgREST (credencial inválida, 5xx, permisos) significa
      // que la dependencia no sirve: 'down' y 503, no 'degraded' con 200.
      checks.supabase = error ? 'down' : 'ok'
      if (error) overall = 'down'
    } catch {
      checks.supabase = 'down'
      overall = 'down'
    }

    // Solo comprueba que esté CONFIGURADA; no valida la credencial contra el proveedor.
    checks.mercadopago = process.env.MERCADOPAGO_ACCESS_TOKEN ? 'configured' : 'misconfigured'
    // Igual que en notification-svc: un chequeo blando no debe rebajar 'down'
    // a 'degraded' (devolvía 200 con Supabase inalcanzable).
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN && overall === 'ok') overall = 'degraded'

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
