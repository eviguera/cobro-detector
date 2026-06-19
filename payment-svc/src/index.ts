import Fastify from 'fastify'
import { paymentRoutes } from './routes/payments.js'
import { healthRoutes } from './routes/health.js'

const server = Fastify({ logger: true })

await server.register(healthRoutes)
await server.register(paymentRoutes)

const port = Number(process.env.PORT) || 3002

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Payment service running on port ${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
