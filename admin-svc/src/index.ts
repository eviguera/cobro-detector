import Fastify from 'fastify'
import { adminRoutes } from './routes/admin.js'
import { healthRoutes } from './routes/health.js'

const server = Fastify({ logger: true })

await server.register(healthRoutes)
await server.register(adminRoutes)

const port = Number(process.env.PORT) || 3005

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Admin service running on port ${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
