import Fastify from 'fastify'
import { z } from 'zod'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'

// Validación de variables de entorno
const envSchema = z.object({
  PORT: z.string().default('3004'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

const app = Fastify({ logger: true })

// Manejo de errores global
app.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  
  if (error.validation) {
    return reply.status(400).send({ error: 'Validation error', details: error.message })
  }
  
  return reply.status(500).send({ error: 'Internal server error' })
})

await app.register(healthRoutes)
await app.register(authRoutes)

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  app.log.info(`Received signal ${signal}, closing gracefully...`)
  await app.close()
  process.exit(0)
}

process.on('SIGINT', () => closeGracefully('SIGINT'))
process.on('SIGTERM', () => closeGracefully('SIGTERM'))

try {
  await app.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
