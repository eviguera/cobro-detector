import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('../infrastructure/adapters/mercadopago-gateway.adapter.js', () => ({
  MercadoPagoGatewayAdapter: vi.fn(() => ({
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
  })),
}))

vi.mock('../infrastructure/adapters/supabase-order-repository.adapter.js', () => ({
  SupabaseOrderRepositoryAdapter: vi.fn(() => {
    const orders: Record<string, Record<string, unknown>> = {}
    return {
      create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
        const order = { id: 'order-1', ...data, mp_preference_id: null, mp_payment_id: null, created_at: '2024-06-01T00:00:00.000Z' }
        orders['order-1'] = order
        return order
      }),
      findById: vi.fn().mockImplementation((id: string) => orders[id] ?? null),
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
  SupabaseCreditRepositoryAdapter: vi.fn(() => ({
    getCredits: vi.fn(),
    consumeAtomic: vi.fn(),
    addCredits: vi.fn(),
  })),
}))

vi.mock('../infrastructure/adapters/supabase-client.js', () => ({
  createServiceClient: vi.fn(() => ({})),
}))

const { paymentRoutes } = await import('./payments.js')
const { healthRoutes } = await import('./health.js')

describe('Payment Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    await app.register(healthRoutes)
    await app.register(paymentRoutes)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', service: 'payment-svc' })
    expect(res.json()).toHaveProperty('timestamp')
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
    expect(res.json()).toHaveProperty('amount')
  })

  it('POST /v1/unlock returns unlocked=true when recoverableAmount is 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/unlock',
      payload: {
        userId: 'user-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        analysisId: 'analysis-1',
        analysisFileName: 'estado-cuenta.pdf',
        recoverableAmount: 0,
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
