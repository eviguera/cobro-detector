import Fastify from 'fastify'
import cors from '@fastify/cors'
import * as Sentry from '@sentry/node'
import { analyzeRoutes } from './routes/analyze.js'
import { healthRoutes } from './routes/health.js'

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

// Orígenes permitidos para las llamadas desde el frontend (Next.js).
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

await server.register(healthRoutes)
await server.register(analyzeRoutes)

const port = Number(process.env.PORT) || 3001

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Analysis service running on port ${port} (CORS: ${origins.join(', ')})`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
