import { describe, it, expect, vi } from 'vitest'
import { CreatePaymentUseCase } from './create-payment.use-case.js'
import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'

function mockPaymentGateway(overrides?: Partial<PaymentGateway>): PaymentGateway {
  return {
    createPreference: vi.fn().mockResolvedValue({
      id: 'pref-123',
      initPoint: 'https://mercadopago.com/init/123',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init/123',
    }),
    verifyWebhook: vi.fn(),
    getPaymentStatus: vi.fn(),
    ...overrides,
  }
}

function mockOrderRepository(overrides?: Partial<OrderRepository>): OrderRepository {
  const baseOrder = {
    id: 'order-1',
    user_id: 'user-1',
    plan: 'inicial',
    credits_purchased: 1,
    amount_clp: 20000,
    status: 'pending',
    mp_preference_id: null,
    mp_payment_id: null,
    created_at: '2024-06-01T00:00:00.000Z',
  }
  return {
    create: vi.fn().mockResolvedValue(baseOrder),
    findById: vi.fn(),
    findByExternalRef: vi.fn(),
    updateStatus: vi.fn(),
    ...overrides,
  }
}

function mockCreditRepository(overrides?: Partial<CreditRepository>): CreditRepository {
  return {
    getCredits: vi.fn(),
    consumeAtomic: vi.fn(),
    addCredits: vi.fn(),
    ...overrides,
  }
}

describe('CreatePaymentUseCase', () => {
  const baseParams = {
    userId: 'user-1',
    userEmail: 'test@example.com',
    userName: 'Test User',
    planKey: 'inicial',
    appUrl: 'https://cobrodetector.cl',
  }

  it('creates a payment for the inicial plan', async () => {
    const useCase = new CreatePaymentUseCase(
      mockPaymentGateway(),
      mockOrderRepository(),
      mockCreditRepository(),
    )

    const result = await useCase.execute(baseParams)

    expect(result.orderId).toBe('order-1')
    expect(result.initPoint).toBe('https://mercadopago.com/init/123')
  })

  it('creates a payment for the plus plan', async () => {
    const orderRepo = mockOrderRepository()
    const useCase = new CreatePaymentUseCase(
      mockPaymentGateway(),
      orderRepo,
      mockCreditRepository(),
    )

    const result = await useCase.execute({ ...baseParams, planKey: 'plus' })

    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'plus', credits_purchased: 2, amount_clp: 30000 }),
    )
    expect(result.orderId).toBe('order-1')
  })

  it('creates a payment for the contador plan', async () => {
    const orderRepo = mockOrderRepository()
    const useCase = new CreatePaymentUseCase(
      mockPaymentGateway(),
      orderRepo,
      mockCreditRepository(),
    )

    const result = await useCase.execute({ ...baseParams, planKey: 'contador' })

    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'contador', credits_purchased: 10, amount_clp: 100000 }),
    )
    expect(result.orderId).toBe('order-1')
  })

  it('handles platino plan without calling MercadoPago', async () => {
    const paymentGateway = mockPaymentGateway()
    const orderRepo = mockOrderRepository()
    const useCase = new CreatePaymentUseCase(
      paymentGateway,
      orderRepo,
      mockCreditRepository(),
    )

    const result = await useCase.execute({ ...baseParams, planKey: 'platino' })

    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'platino',
        credits_purchased: 999,
        amount_clp: 0,
        payment_provider: 'success_fee',
        fee_percentage: 20,
      }),
    )
    expect(paymentGateway.createPreference).not.toHaveBeenCalled()
    expect(result.message).toBe('Plan de éxito activado. Se cobrará el 20% de lo recuperado.')
    expect(result.order).toBeDefined()
    expect(result.order.id).toBe('order-1')
  })

  it('throws for an invalid plan', async () => {
    const useCase = new CreatePaymentUseCase(
      mockPaymentGateway(),
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await expect(useCase.execute({ ...baseParams, planKey: 'nonexistent' }))
      .rejects.toThrow('Plan inválido')
  })

  it('passes correct item data to MercadoPago', async () => {
    const paymentGateway = mockPaymentGateway()
    const useCase = new CreatePaymentUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await useCase.execute(baseParams)

    expect(paymentGateway.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{
          id: 'inicial',
          title: 'CobroDetector · Plan Inicial',
          description: '1 créditos de análisis de estado de cuenta',
          quantity: 1,
          unit_price: 20000,
        }],
        payer: { email: 'test@example.com', name: 'Test User' },
        externalReference: 'order-1',
        appUrl: 'https://cobrodetector.cl',
      }),
    )
  })

  it('updates order with mp_preference_id after creating preference', async () => {
    const orderRepo = mockOrderRepository()
    const paymentGateway = mockPaymentGateway()
    const useCase = new CreatePaymentUseCase(
      paymentGateway,
      orderRepo,
      mockCreditRepository(),
    )

    await useCase.execute(baseParams)

    expect(orderRepo.updateStatus).toHaveBeenCalledWith('order-1', {
      mp_preference_id: 'https://mercadopago.com/init/123',
    })
  })
})
