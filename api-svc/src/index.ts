import Fastify from 'fastify'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: true })
const PORT = parseInt(process.env.PORT ?? '3004', 10)

await app.register(healthRoutes)
await app.register(authRoutes)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`API service listening on port ${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

export default app
