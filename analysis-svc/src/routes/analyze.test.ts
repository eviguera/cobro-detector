import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

const ANALYSIS_ID = '123e4567-e89b-12d3-a456-426614174000'

const state = vi.hoisted(() => ({
  plan: 'credits' as 'credits' | 'platino',
  companyId: null as string | null,
  analysisFound: true,
  ownerId: 'user-1',
  chargeResult: 'charged' as 'charged' | 'already' | 'no_credits',
  chargeError: null as null | { message: string },
  chargeArgs: [] as Array<{ p_analysis_id: string; p_company_id: string | null }>,
  refunds: [] as string[],
  enqueued: 0,
  enqueueError: false,
  reportData: null as Record<string, unknown> | null,
}))

vi.mock('../infrastructure/adapters/supabase-client.js', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => {
            if (!state.analysisFound) {
              return { data: null, error: { code: 'PGRST116', message: 'no rows' } }
            }
            return {
              data: {
                id: ANALYSIS_ID,
                user_id: state.ownerId,
                company_id: state.companyId,
                plan: state.plan,
                status: 'processing',
                file_name: 'cartola.pdf',
                file_type: 'application/pdf',
                file_url: 'http://127.0.0.1:54321/storage/v1/object/sign/analyses/cartola.pdf',
                storage_path: 'user-1/cartola.pdf',
                encryption_key_iv: 'iv',
                encryption_key_base64: 'key',
              },
              error: null,
            }
          }),
        })),
      })),
    })),
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'charge_analysis_credit') {
        state.chargeArgs.push(args as { p_analysis_id: string; p_company_id: string | null })
        return { data: state.chargeResult, error: state.chargeError }
      }
      if (fn === 'refund_analysis_credit') {
        state.refunds.push(args.p_analysis_id as string)
        return { data: true, error: null }
      }
      return { data: null, error: null }
    }),
  })),
}))

vi.mock('../infrastructure/adapters/supabase-user-client.js', () => ({
  createUserClient: vi.fn(() => ({
    rpc: vi.fn(async () => ({ data: state.reportData, error: null })),
  })),
}))

vi.mock('../security/supabase-jwt.js', () => ({
  requireAuth: vi.fn(async (request: { authUser: unknown }) => {
    request.authUser = { id: 'user-1', email: 'user@example.com', role: 'authenticated' }
    return true
  }),
  requireSelfOr403: vi.fn(async () => true),
  extractBearerToken: vi.fn(() => 'token-de-prueba'),
}))

vi.mock('../security/supabase-url.js', () => ({
  InvalidFileUrlError: class InvalidFileUrlError extends Error {},
  resolveAllowedFileUrl: vi.fn((url: string) => new URL(url)),
}))

vi.mock('../infrastructure/queue-connection.js', () => ({
  queue: {
    enqueue: vi.fn(async () => {
      if (state.enqueueError) throw new Error('redis down')
      state.enqueued += 1
    }),
  },
  redis: { ping: vi.fn(async () => 'PONG') },
}))

const { analyzeRoutes } = await import('./analyze.js')

function payload() {
  return { analysisId: ANALYSIS_ID }
}

describe('POST /v1/analyze — cobro de créditos server-side', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    state.plan = 'credits'
    state.companyId = null
    state.analysisFound = true
    state.ownerId = 'user-1'
    state.chargeResult = 'charged'
    state.chargeError = null
    state.chargeArgs = []
    state.refunds = []
    state.enqueued = 0
    state.enqueueError = false
    state.reportData = null

    app = Fastify({ logger: false })
    await app.register(analyzeRoutes)
    await app.ready()
  })

  it('cobra 1 crédito y encola cuando el plan es por créditos', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(202)
    expect(state.chargeArgs).toEqual([{ p_analysis_id: ANALYSIS_ID, p_company_id: null }])
    expect(state.enqueued).toBe(1)
  })

  it('propaga el company_id del análisis al cobro', async () => {
    state.companyId = 'company-1'

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(202)
    expect(state.chargeArgs[0].p_company_id).toBe('company-1')
  })

  // Regresión: antes el crédito se descontaba solo en el navegador, así que
  // llamar este endpoint directo daba análisis gratis ilimitados.
  it('devuelve 402 y no encola si el usuario no tiene créditos', async () => {
    state.chargeResult = 'no_credits'

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(402)
    expect(res.json()).toEqual({ error: 'Sin créditos disponibles' })
    expect(state.enqueued).toBe(0)
  })

  // Regresión: dos POST al mismo analysisId cobraban dos créditos.
  it('devuelve 409 si el análisis ya se cobró (idempotencia durable)', async () => {
    state.chargeResult = 'already'

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ error: 'El análisis ya está en curso' })
    expect(state.enqueued).toBe(0)
  })

  it('devuelve 500 y no encola si falla el cobro', async () => {
    state.chargeError = { message: 'boom' }

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: 'No se pudo descontar el crédito' })
    expect(state.enqueued).toBe(0)
  })

  // El plan Platino no consume crédito: se cobra el 20% del monto recuperado.
  it('no cobra crédito cuando el plan es platino', async () => {
    state.plan = 'platino'

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(202)
    expect(state.chargeArgs).toEqual([])
    expect(state.enqueued).toBe(1)
  })

  it('devuelve 404 si el análisis no existe', async () => {
    state.analysisFound = false

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(404)
    expect(state.chargeArgs).toEqual([])
  })

  it('devuelve 403 si el análisis es de otro usuario', async () => {
    state.ownerId = 'user-2'

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(403)
    expect(state.chargeArgs).toEqual([])
    expect(state.enqueued).toBe(0)
  })

  // Si el encolado falla después de cobrar, el crédito se devuelve.
  it('devuelve el crédito y responde 503 si falla el encolado', async () => {
    state.enqueueError = true

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ error: 'No se pudo encolar el análisis' })
    expect(state.refunds).toEqual([ANALYSIS_ID])
  })

  it('no pide devolución si falla el encolado en Plan Platino (no se cobró)', async () => {
    state.plan = 'platino'
    state.enqueueError = true

    const res = await app.inject({ method: 'POST', url: '/v1/analyze', payload: payload() })

    expect(res.statusCode).toBe(503)
    expect(state.refunds).toEqual([])
  })
})

describe('GET /v1/analyses/:id — paywall en la base', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    state.reportData = null
    app = Fastify({ logger: false })
    await app.register(analyzeRoutes)
    await app.ready()
  })

  it('devuelve el reporte que entrega get_analysis_report', async () => {
    state.reportData = { id: ANALYSIS_ID, status: 'completed', anomalies: [{ type: 'x' }] }

    const res = await app.inject({ method: 'GET', url: `/v1/analyses/${ANALYSIS_ID}` })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: ANALYSIS_ID, status: 'completed' })
  })

  it('devuelve 404 cuando la RPC no encuentra el análisis (o es de otro usuario)', async () => {
    state.reportData = null

    const res = await app.inject({ method: 'GET', url: `/v1/analyses/${ANALYSIS_ID}` })

    expect(res.statusCode).toBe(404)
  })
})
