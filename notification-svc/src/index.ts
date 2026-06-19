import Fastify from 'fastify'
import 'dotenv/config'
import { healthRoutes } from './routes/health.js'
import { notificationRoutes } from './routes/notifications.js'

const server = Fastify({ logger: true })

await server.register(healthRoutes)
await server.register(notificationRoutes)

const port = Number(process.env.PORT) || 3003

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Notification service running on port ${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
