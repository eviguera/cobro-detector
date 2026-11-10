import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    const checks: Record<string, string> = {}
    let overall = 'ok'

    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('profiles').select('id').limit(1)
      // Un error de PostgREST (credencial inválida, 5xx, permisos) significa
      // que la dependencia no sirve: 'down' y 503, no 'degraded' con 200.
      checks.supabase = error ? 'down' : 'ok'
      if (error) overall = 'down'
    } catch {
      checks.supabase = 'down'
      overall = 'down'
    }

    // Solo comprueba que esté CONFIGURADA; no valida la credencial contra el proveedor.
    checks.resend = process.env.RESEND_API_KEY ? 'configured' : 'misconfigured'
    // Un chequeo blando (dependencia opcional) nunca debe rebajar un estado
    // 'down' a 'degraded': eso devolvía HTTP 200 con Supabase inalcanzable y
    // los monitores/load balancers lo leían como servicio sano.
    if (!process.env.RESEND_API_KEY && overall === 'ok') overall = 'degraded'

    const statusCode = overall === 'down' ? 503 : 200

    request.log.warn({ checks, overall }, 'Health check')
    return reply.status(statusCode).send({
      status: overall,
      service: 'notification-svc',
      timestamp: new Date().toISOString(),
      checks,
    })
  })
}
