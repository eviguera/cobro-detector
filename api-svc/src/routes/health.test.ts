import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { healthRoutes } from './health.js'

describe('healthRoutes', () => {
  it('GET / expone metadata del servicio sin tocar dependencias externas', async () => {
    const app = Fastify()
    await app.register(healthRoutes)

    const res = await app.inject({ method: 'GET', url: '/' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      service: 'api-svc',
      version: '1.0.0',
      endpoints: ['/health', '/v1/verify', '/v1/keys/:userId'],
    })

    await app.close()
  })
})
