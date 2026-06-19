import Fastify from 'fastify'
import { analyzeRoutes } from './routes/analyze.js'
import { healthRoutes } from './routes/health.js'

const server = Fastify({ logger: true })

await server.register(healthRoutes)
await server.register(analyzeRoutes)

const port = Number(process.env.PORT) || 3001

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Analysis service running on port ${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
