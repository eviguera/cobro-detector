import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

// Mock del cliente Supabase antes de importar las rutas
const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../infrastructure/supabase-client.js', () => ({
  createServiceClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

import { authRoutes } from './auth.js'

describe('Auth Routes', () => {
  let app: Fastify.FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify()
    await app.register(authRoutes)
  })

  it('POST /v1/verify should return 400 for invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/verify',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
  })

  it('POST /v1/verify should return 401 for invalid key', async () => {
    mockRpc.mockResolvedValue({
      data: { valid: false, key_id: null, user_id: null, permissions: null, rate_limit: 0 },
      error: null,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/v1/verify',
      payload: { apiKey: 'invalid-key' },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body).toEqual({ authenticated: false })
  })

  it('POST /v1/verify should return 200 with auth data for valid key', async () => {
    mockRpc.mockResolvedValue({
      data: {
        valid: true,
        key_id: 'key-123',
        user_id: 'user-456',
        permissions: ['read'],
        rate_limit: 100,
      },
      error: null,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/v1/verify',
      payload: { apiKey: 'valid-key' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.authenticated).toBe(true)
    expect(body.userId).toBe('user-456')
  })

  it('GET /v1/keys/:userId should return list of keys', async () => {
    const mockKeys = [
      {
        id: 'key-1',
        name: 'Test Key',
        key_prefix: 'cd_test',
        permissions: ['read'],
        is_active: true,
        expires_at: null,
        created_at: '2024-01-01',
      },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockKeys,
            error: null,
          }),
        }),
      }),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/v1/keys/user-123',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).toHaveProperty('name')
    expect(body[0]).toHaveProperty('key_prefix')
  })

  it('GET /v1/keys/:userId should return empty array when no keys found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/v1/keys/user-123',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })
})
