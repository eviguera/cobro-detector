import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import * as Sentry from '@sentry/node'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'

// HARDENED (2026-11): Sentry para monitoreo de errores en backend.
// Solo se activa si SENTRY_DSN está configurado (variable de entorno).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '1.0.0',
  })
}

const app = Fastify({ logger: true })

// HARDENED (2026-11): CORS estricto + rate limit.
// En producción se define CORS_ORIGINS con el dominio de la app.
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const origins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins

await app.register(cors, {
  origin: origins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
})

await app.register(healthRoutes)
await app.register(authRoutes)

app.listen({ port: parseInt(process.env.PORT ?? '3004', 10), host: '0.0.0.0' })
