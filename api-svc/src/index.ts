import Fastify from 'fastify'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: true })

await app.register(healthRoutes)
await app.register(authRoutes)

app.listen({ port: parseInt(process.env.PORT ?? '3004', 10), host: '0.0.0.0' })
