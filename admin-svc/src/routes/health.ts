import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
      
      if (error) {
        return { status: 'degraded', service: 'admin-svc', timestamp: new Date().toISOString(), db: 'error' }
      }
      
      return { status: 'ok', service: 'admin-svc', timestamp: new Date().toISOString(), db: 'connected' }
    } catch {
      return { status: 'degraded', service: 'admin-svc', timestamp: new Date().toISOString(), db: 'disconnected' }
    }
  })
}
