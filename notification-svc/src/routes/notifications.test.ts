import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

const { mockSend, mockTrack, healthState } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue(true),
  mockTrack: vi.fn().mockResolvedValue(undefined),
  // Permite simular una caída dura de Supabase desde el test de /health.
  healthState: { throwOnQuery: false, dbError: null as null | { message: string } },
}))

vi.mock('../infrastructure/adapters/resend-email.adapter.js', () => ({
  // vitest 5: los mocks instanciados con `new` deben usar function/class.
  ResendEmailAdapter: vi.fn().mockImplementation(function () {
    return { send: mockSend }
  }),
}))

vi.mock('../infrastructure/adapters/supabase-event-repository.adapter.js', () => ({
  SupabaseEventRepositoryAdapter: vi.fn().mockImplementation(function () {
    return { track: mockTrack }
  }),
}))

vi.mock('../infrastructure/adapters/supabase-client.js', () => ({
  createServiceClient: vi.fn().mockReturnValue({
    // Stub del ownership check: el análisis pertenece al usuario autenticado.
    from: vi.fn(() => {
      if (healthState.throwOnQuery) throw new Error('supabase unreachable')
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        // /health usa la forma query -> select -> limit (sin await intermedio).
        limit: vi.fn().mockResolvedValue({ error: healthState.dbError }),
        single: vi.fn().mockResolvedValue({ data: { user_id: 'user-1' }, error: null }),
      }
    }),
  }),
}))

// HARDENED (2026-11): ambas rutas exigen JWT. El helper se testea en runtime
// con token real; acá se mockea como usuario autenticado.
vi.mock('../security/supabase-jwt.js', () => {
  const authUser = { id: 'user-1', email: 'user@example.com', role: 'authenticated' }
  return {
    requireAuth: vi.fn().mockImplementation(async (request: { authUser: unknown }) => {
      request.authUser = authUser
      return true
    }),
    requireSelfOr403: vi.fn().mockImplementation(async () => true),
  }
})

import { notificationRoutes } from './notifications.js'
import { healthRoutes } from './health.js'

describe('Notification Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    mockSend.mockClear()
    mockTrack.mockClear()
    healthState.throwOnQuery = false
    healthState.dbError = null
    // El health check lee RESEND_API_KEY del entorno: el test lo controla.
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    await app.register(healthRoutes)
    await app.register(notificationRoutes)
    await app.ready()
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await app.close()
  })

  it('GET /health retorna 200 con status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject({ status: 'ok', service: 'notification-svc' })
    expect(body.timestamp).toBeDefined()
  })

  // Regresión: un chequeo blando (Resend sin configurar) no debe enmascarar
  // una caída dura de Supabase. Antes devolvía 200/"degraded" y los monitores
  // de uptime lo tomaban como servicio sano.
  it('GET /health devuelve 503 cuando Supabase está caído aunque falte RESEND_API_KEY', async () => {
    healthState.throwOnQuery = true
    vi.stubEnv('RESEND_API_KEY', '')

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(503)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject({
      status: 'down',
      service: 'notification-svc',
      checks: { supabase: 'down', resend: 'misconfigured' },
    })
  })

  // Un error de la base (PostgREST 5xx/permisos) no es "degradado": el
  // servicio no puede atender, así que debe ser 503.
  it('GET /health devuelve 503 si Supabase responde con error', async () => {
    healthState.dbError = { message: 'permission denied' }
    vi.stubEnv('RESEND_API_KEY', 're_test')

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(503)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'down', checks: { supabase: 'down' } })
  })

  it('GET /health reporta degraded (200) si falta RESEND_API_KEY pero Supabase responde', async () => {
    vi.stubEnv('RESEND_API_KEY', '')

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject({ status: 'degraded', checks: { supabase: 'ok', resend: 'misconfigured' } })
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
