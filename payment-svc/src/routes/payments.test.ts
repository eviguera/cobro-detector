import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

// Permite simular una caída dura de Supabase desde el test de /health.
const healthState = vi.hoisted(() => ({ throwOnQuery: false, dbError: null as null | { message: string } }))
// Monto que el servidor lee de analyses.recoverable_amount (fuente de verdad).
const analysisState = vi.hoisted(() => ({
  recoverableAmount: 50000,
  notFound: false,
  ownerId: 'user-1',
}))

vi.mock('../infrastructure/adapters/mercadopago-gateway.adapter.js', () => ({
  // vitest 5 exige `function`/`class` en mocks que se usan con `new`
  // (las arrow functions no son constructibles).
  MercadoPagoGatewayAdapter: vi.fn(function () {
    return {
      createPreference: vi.fn().mockResolvedValue({
        id: 'pref-1',
        initPoint: 'https://mercadopago.com/init/1',
        sandboxInitPoint: 'https://sandbox.mercadopago.com/init/1',
      }),
      verifyWebhook: vi.fn().mockReturnValue(true),
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'approved',
        statusDetail: 'accredited',
        externalRef: '550e8400-e29b-41d4-a716-446655440000',
      }),
    }
  }),
}))

vi.mock('../infrastructure/adapters/supabase-order-repository.adapter.js', () => ({
  SupabaseOrderRepositoryAdapter: vi.fn(function () {
    const orders: Record<string, Record<string, unknown>> = {}
    return {
      create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
        const order = { id: 'order-1', ...data, mp_preference_id: null, mp_payment_id: null, created_at: '2024-06-01T00:00:00.000Z' }
        orders['order-1'] = order
        return order
      }),
      findById: vi.fn().mockImplementation((id: string) => orders[id] ?? null),
      confirmPaid: vi.fn().mockResolvedValue(true),
      findByExternalRef: vi.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        credits_purchased: 5,
        status: 'pending',
        plan: 'plus',
      }),
      updateStatus: vi.fn(),
    }
  }),
}))

vi.mock('../infrastructure/adapters/supabase-credit-repository.adapter.js', () => ({
  SupabaseCreditRepositoryAdapter: vi.fn(function () {
    return {
      getCredits: vi.fn(),
      consumeAtomic: vi.fn(),
      addCredits: vi.fn(),
    }
  }),
}))

vi.mock('../infrastructure/adapters/supabase-client.js', () => ({
  createServiceClient: vi.fn(function () {
    return {
      // Stub del ownership check de /v1/unlock: el análisis pertenece al usuario autenticado.
      from: vi.fn(function () {
        if (healthState.throwOnQuery) throw new Error('supabase unreachable')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          // /health usa query -> select -> limit antes de resolver.
          limit: vi.fn().mockResolvedValue({ error: healthState.dbError }),
          single: vi.fn().mockResolvedValue(
            analysisState.notFound
              ? { data: null, error: { code: 'PGRST116', message: 'no rows returned' } }
              : {
                  data: {
                    id: 'analysis-1',
                    user_id: analysisState.ownerId,
                    recoverable_amount: analysisState.recoverableAmount,
                  },
                  error: null,
                },
          ),
        }
      }),
    }
  }),
}))

// HARDENED (2026-11): las rutas protegidas exigen JWT. El helper se testea por
// separado (runtime con token real), acá se mockea como usuario autenticado.
vi.mock('../security/supabase-jwt.js', () => {
  const authUser = { id: 'user-1', email: 'test@test.com', role: 'authenticated' }
  return {
    requireAuth: vi.fn().mockImplementation(async (request: { authUser: unknown }) => {
      request.authUser = authUser
      return true
    }),
    requireSelfOr403: vi.fn().mockImplementation(async (_request: unknown, _reply: unknown, userId: string) => {
      return userId === 'user-1'
    }),
  }
})

const { paymentRoutes } = await import('./payments.js')
const { healthRoutes } = await import('./health.js')

describe('Payment Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    healthState.throwOnQuery = false
    healthState.dbError = null
    analysisState.recoverableAmount = 50000
    analysisState.notFound = false
    analysisState.ownerId = 'user-1'
    await app.register(healthRoutes)
    await app.register(paymentRoutes)
    await app.ready()
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await app.close()
  })

  // Aserción exacta: antes aceptaba ['ok','degraded'] y por eso el bug de
  // severidad enmascarada pasaba desapercibido.
  it('GET /health returns 200 con status ok cuando todo está configurado', async () => {
    healthState.throwOnQuery = false
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-test')
    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({
      service: 'payment-svc',
      status: 'ok',
      checks: { supabase: 'ok', mercadopago: 'configured' },
    })
    expect(body).toHaveProperty('timestamp')
  })

  it('GET /health devuelve 503 si Supabase responde con error', async () => {
    healthState.dbError = { message: 'permission denied' }
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-test')

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ status: 'down', checks: { supabase: 'down' } })
  })

  // Regresión: sin MERCADOPAGO_ACCESS_TOKEN el chequeo blando degradaba el
  // estado 'down' a 'degraded' y /health respondía 200 con Supabase caído.
  it('GET /health devuelve 503 si Supabase está caído aunque falte MERCADOPAGO_ACCESS_TOKEN', async () => {
    healthState.throwOnQuery = true
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', '')

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({
      status: 'down',
      service: 'payment-svc',
      checks: { supabase: 'down', mercadopago: 'misconfigured' },
    })
    vi.unstubAllEnvs()
  })

  it('POST /v1/preferences with valid body returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/preferences',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test User',
        planKey: 'inicial',
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('orderId')
    expect(body).toHaveProperty('initPoint')
    expect(body).toHaveProperty('preferenceId')
  })

  it('POST /v1/preferences with missing fields returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/preferences',
      payload: { userId: 'user-1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toHaveProperty('error')
  })

  it('POST /v1/preferences with invalid email returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/preferences',
      payload: {
        userId: 'user-1',
        userEmail: 'not-an-email',
        userName: null,
        planKey: 'inicial',
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('POST /v1/webhook with valid signature returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/webhook',
      headers: { 'x-signature': 'ts=1718000000,v1=validhash' },
      payload: { type: 'payment', data: { id: 'pay-123' } },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ received: true })
  })

  it('POST /v1/webhook without signature returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/webhook',
      payload: { type: 'payment', data: { id: 'pay-123' } },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Falta firma' })
  })

  it('POST /v1/unlock with valid body returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/unlock',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        analysisId: 'analysis-1',
        analysisFileName: 'estado-cuenta.pdf',
        recoverableAmount: 50000,
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('initPoint')
    // 20% de analyses.recoverable_amount (50000), no del body.
    expect(res.json()).toHaveProperty('amount', 10000)
  })

  it('POST /v1/unlock devuelve 404 si el análisis no existe', async () => {
    analysisState.notFound = true
    const res = await app.inject({
      method: 'POST',
      url: '/v1/unlock',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        analysisId: 'analysis-1',
        analysisFileName: 'estado-cuenta.pdf',
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Analysis not found' })
  })

  it('POST /v1/unlock devuelve 403 si el análisis es de otro usuario', async () => {
    analysisState.ownerId = 'user-2'
    const res = await app.inject({
      method: 'POST',
      url: '/v1/unlock',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        analysisId: 'analysis-1',
        analysisFileName: 'estado-cuenta.pdf',
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ error: 'Forbidden: analysis belongs to another user' })
  })

  // Regresión: el monto lo dictaba el navegador (recoverableAmount: 1 => cobro
  // de 0 CLP). Ahora manda la base de datos.
  it('POST /v1/unlock ignora el recoverableAmount del cliente y cobra según la DB', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/unlock',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        analysisId: 'analysis-1',
        analysisFileName: 'estado-cuenta.pdf',
        recoverableAmount: 1,
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('amount', 10000)
  })

  it('POST /v1/unlock returns unlocked=true cuando la DB no tiene monto a cobrar', async () => {
    analysisState.recoverableAmount = 0
    const res = await app.inject({
      method: 'POST',
      url: '/v1/unlock',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        analysisId: 'analysis-1',
        analysisFileName: 'estado-cuenta.pdf',
        recoverableAmount: 999999,
        appUrl: 'https://cobrodetector.cl',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ unlocked: true })
  })

  it('GET /v1/orders/:id returns 404 for unknown order', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orders/non-existent-id',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Order not found' })
  })
})
