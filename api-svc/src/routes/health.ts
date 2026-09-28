import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/supabase-client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { service: 'api-svc', version: '1.0.0', endpoints: ['/health', '/v1/verify', '/v1/keys/:userId'] }
  })

  app.get('/health', async () => {
    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('api_keys').select('id', { count: 'exact', head: true })
      
      if (error) {
        return { status: 'degraded', service: 'api-svc', timestamp: new Date().toISOString(), db: 'error' }
      }
      
      return { status: 'ok', service: 'api-svc', timestamp: new Date().toISOString(), db: 'connected' }
    } catch {
      return { status: 'degraded', service: 'api-svc', timestamp: new Date().toISOString(), db: 'disconnected' }
    }
  })
}
