import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { service: 'api-svc', version: '1.0.0', endpoints: ['/health', '/v1/verify', '/v1/keys/:userId'] }
  })

  app.get('/health', async () => {
    return { status: 'ok', service: 'api-svc', timestamp: new Date().toISOString() }
  })
}
