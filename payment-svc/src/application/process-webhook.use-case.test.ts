import { describe, it, expect, vi } from 'vitest'
import { ProcessWebhookUseCase } from './process-webhook.use-case.js'
import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'

function mockPaymentGateway(overrides?: Partial<PaymentGateway>): PaymentGateway {
  return {
    createPreference: vi.fn(),
    verifyWebhook: vi.fn().mockReturnValue(true),
    getPaymentStatus: vi.fn().mockResolvedValue({
      status: 'approved',
      statusDetail: 'accredited',
      externalRef: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ...overrides,
  }
}

function mockOrderRepository(order?: Partial<OrderRepository>): OrderRepository & { setOrder: (o: Record<string, unknown> | null) => void } {
  let mockOrder: Record<string, unknown> | null = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: 'user-1',
    credits_purchased: 5,
    status: 'pending',
    plan: 'plus',
  }

  const repo: OrderRepository & { setOrder: (o: Record<string, unknown> | null) => void } = {
    create: vi.fn(),
    findById: vi.fn(),
    findByExternalRef: vi.fn().mockImplementation(() =>
      mockOrder ? { ...mockOrder } as Record<string, unknown> : null,
    ),
    updateStatus: vi.fn(),
    setOrder(o) { mockOrder = o },
    ...order,
  }

  return repo
}

function mockCreditRepository(overrides?: Partial<CreditRepository>): CreditRepository {
  return {
    getCredits: vi.fn(),
    consumeAtomic: vi.fn(),
    addCredits: vi.fn(),
    ...overrides,
  }
}

function validBody(type = 'payment', overrides = {}): string {
  return JSON.stringify({
    type,
    data: { id: 'pay-12345' },
    'request-id': 'req-abc',
    ...overrides,
  })
}

describe('ProcessWebhookUseCase', () => {
  it('throws when signature is missing', async () => {
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await expect(useCase.execute(validBody(), null))
      .rejects.toThrow('Falta firma')
  })

  it('throws when signature is invalid', async () => {
    const paymentGateway = mockPaymentGateway({ verifyWebhook: vi.fn().mockReturnValue(false) })
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=badhash'))
      .rejects.toThrow('Firma inválida')
    expect(paymentGateway.verifyWebhook).toHaveBeenCalledWith('ts=123,v1=badhash', validBody())
  })

  it('skips processing when type is not payment', async () => {
    const paymentGateway = mockPaymentGateway()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
    )

    const result = await useCase.execute(validBody('plan'), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true })
  })

  it('throws when payment ID is missing', async () => {
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await expect(useCase.execute(JSON.stringify({ type: 'payment', data: {} }), 'ts=123,v1=hash'))
      .rejects.toThrow('Payment ID faltante')
  })

  it('throws when external reference is missing', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({ status: 'approved', externalRef: undefined }),
    })
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=hash'))
      .rejects.toThrow('Sin referencia externa')
  })

  it('returns unlock: true when externalRef starts with unlock_', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'approved',
        externalRef: 'unlock_analysis-123',
      }),
    })
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
    )

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, unlock: true })
  })

  it('throws when externalRef is not a valid UUID', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'approved',
        externalRef: 'not-a-uuid',
      }),
    })
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=hash'))
      .rejects.toThrow('externalRef inválido')
  })

  it('marks order as paid and adds credits when payment is approved', async () => {
    const paymentGateway = mockPaymentGateway()
    const orderRepo = mockOrderRepository()
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo)

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'approved' })
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ status: 'paid', mp_payment_id: 'pay-12345' }),
    )
    expect(creditRepo.addCredits).toHaveBeenCalledWith('user-1', 5)
  })

  it('marks order as failed and does NOT add credits when payment is rejected', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'rejected',
        statusDetail: 'cc_rejected_other_reason',
        externalRef: '550e8400-e29b-41d4-a716-446655440000',
      }),
    })
    const orderRepo = mockOrderRepository()
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo)

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'rejected' })
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ status: 'failed' }),
    )
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
  })

  it('does not double-add credits when order already paid', async () => {
    const orderRepo = mockOrderRepository()
    orderRepo.setOrder({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: 'user-1',
      credits_purchased: 5,
      status: 'paid',
      plan: 'plus',
    })
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      orderRepo,
      creditRepo,
    )

    await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(creditRepo.addCredits).not.toHaveBeenCalled()
  })

  it('returns received even when order is not found', async () => {
    const orderRepo = mockOrderRepository()
    orderRepo.setOrder(null)
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      orderRepo,
      mockCreditRepository(),
    )

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'approved' })
  })
})
