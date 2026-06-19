import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { healthRoutes } from './health.js'
import { adminRoutes } from './admin.js'

interface DbMockData {
  profilesCount: number
  analyses: Array<Record<string, unknown>>
  orders: Array<Record<string, unknown>>
  anomalies: Array<Record<string, unknown>>
  profiles: Array<Record<string, unknown>>
}

const mockState = vi.hoisted(() => {
  const state: { current: DbMockData | null } = { current: null }

  function defaultMockData(): DbMockData {
    const now = new Date()
    return {
      profilesCount: 150,
      analyses: [
        { id: 'a1', status: 'completed', user_id: 'user-1', recoverable_amount: 15000 },
        { id: 'a2', status: 'completed', user_id: 'user-2', recoverable_amount: 25000 },
      ],
      orders: [
        { amount_clp: 19900, status: 'paid' },
        { amount_clp: 29900, status: 'paid' },
      ],
      anomalies: [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ],
      profiles: [
        { id: 'user-1', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'user-2', created_at: now.toISOString() },
      ],
    }
  }

  state.current = defaultMockData()

  return { state, defaultMockData }
})

vi.mock('../infrastructure/adapters/supabase-client.js', () => {
  function resultForTable(table: string) {
    const data = mockState.state.current!
    switch (table) {
      case 'profiles':
        return { count: data.profilesCount, data: data.profiles, error: null }
      case 'analyses':
        return { data: data.analyses, error: null }
      case 'orders':
        return { data: data.orders, error: null }
      case 'anomalies':
        return { data: data.anomalies, error: null }
      default:
        return { data: [], error: null }
    }
  }

  return {
    createServiceClient: vi.fn(() => ({
      from: vi.fn((table: string) => ({
        select: vi.fn((_columns: string, _options?: any) => {
          const res = resultForTable(table)
          const promise = Promise.resolve(res)
          return Object.assign(promise, { eq: vi.fn(() => promise) })
        }),
      })),
    })),
  }
})

describe('admin routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    app = Fastify()
    await app.register(healthRoutes)
    await app.register(adminRoutes)
    await app.ready()
  })

  beforeEach(() => {
    mockState.state.current = mockState.defaultMockData()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /health', () => {
    it('returns 200 with service status', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toMatchObject({ status: 'ok', service: 'admin-svc' })
      expect(body).toHaveProperty('timestamp')
    })
  })

  describe('GET /v1/metrics', () => {
    it('returns 200 with dashboard metrics', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/metrics' })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toEqual({
        totalUsers: 150,
        totalAnalyses: 2,
        totalAnomalies: 0,
        totalRecovered: 40000,
        revenue: 49800,
        activeUsers: 2,
      })
    })
  })

  describe('GET /v1/health', () => {
    it('returns 200 with system health', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/health' })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toMatchObject({
        status: 'healthy',
        groqStatus: 'operational',
        databaseSize: '150 users',
      })
      expect(body).toHaveProperty('lastQueueCheck')
    })
  })

  describe('GET /v1/intelligence', () => {
    it('returns 200 with intelligence data', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/intelligence' })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toMatchObject({
        totalUsers: 150,
        usersWithAnalyses: 2,
        usersWithAnomalies: 2,
        conversionRate: '1.3%',
        churnRisk: {
          threshold: '30 days without activity',
        },
      })
      expect(body.churnRisk.usersAtRisk).toBeGreaterThanOrEqual(1)
    })
  })
})
