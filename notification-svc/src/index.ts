import Fastify from 'fastify'
import 'dotenv/config'
import { z } from 'zod'
import { healthRoutes } from './routes/health.js'
import { notificationRoutes } from './routes/notifications.js'

// Validación de variables de entorno
const envSchema = z.object({
  PORT: z.string().default('3003'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

const server = Fastify({ logger: true })

await server.register(healthRoutes)
await server.register(notificationRoutes)

const port = Number(env.PORT)

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  server.log.info(`Received signal ${signal}, closing gracefully...`)
  await server.close()
  process.exit(0)
}

process.on('SIGINT', () => closeGracefully('SIGINT'))
process.on('SIGTERM', () => closeGracefully('SIGTERM'))

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Notification service running on port ${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
