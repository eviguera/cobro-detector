import Fastify from 'fastify'
import 'dotenv/config'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import * as Sentry from '@sentry/node'
import { healthRoutes } from './routes/health.js'
import { notificationRoutes } from './routes/notifications.js'

// HARDENED (2026-11): Sentry para monitoreo de errores en backend.
// Solo se activa si SENTRY_DSN está configurado (variable de entorno).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '1.0.0',
  })
}

const server = Fastify({ logger: true })

// HARDENED (2026-11): CORS estricto + rate limit.
// En producción se define CORS_ORIGINS con el dominio de la app.
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const origins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins

await server.register(cors, {
  origin: origins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await server.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
})

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
