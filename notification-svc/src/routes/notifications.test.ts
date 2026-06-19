import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

const { mockSend, mockTrack } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue(true),
  mockTrack: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../infrastructure/adapters/resend-email.adapter.js', () => ({
  ResendEmailAdapter: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
}))

vi.mock('../infrastructure/adapters/supabase-event-repository.adapter.js', () => ({
  SupabaseEventRepositoryAdapter: vi.fn().mockImplementation(() => ({
    track: mockTrack,
  })),
}))

vi.mock('../infrastructure/adapters/supabase-client.js', () => ({
  createServiceClient: vi.fn().mockReturnValue({}),
}))

import { notificationRoutes } from './notifications.js'
import { healthRoutes } from './health.js'

describe('Notification Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    mockSend.mockClear()
    mockTrack.mockClear()
    await app.register(healthRoutes)
    await app.register(notificationRoutes)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /health retorna 200 con status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject({ status: 'ok', service: 'notification-svc' })
    expect(body.timestamp).toBeDefined()
  })

  it('POST /v1/send-analysis-notification con body válido retorna 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/send-analysis-notification',
      payload: {
        to: 'user@example.com',
        userName: 'Juan',
        analysisId: '123e4567-e89b-12d3-a456-426614174000',
        anomaliesCount: 3,
        recoverableAmount: 50000,
      },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toEqual({ sent: true })
  })

  it('POST /v1/send-analysis-notification con body inválido retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/send-analysis-notification',
      payload: {
        to: 'email-invalido',
        userName: '',
        analysisId: 'no-es-uuid',
        anomaliesCount: -1,
        recoverableAmount: -1,
      },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.error).toBeDefined()
  })

  it('POST /v1/send-analysis-notification con body incompleto retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/send-analysis-notification',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('POST /v1/send-analysis-notification llama al caso de uso', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/send-analysis-notification',
      payload: {
        to: 'user@example.com',
        userName: 'Juan',
        analysisId: '123e4567-e89b-12d3-a456-426614174000',
        anomaliesCount: 3,
        recoverableAmount: 50000,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
