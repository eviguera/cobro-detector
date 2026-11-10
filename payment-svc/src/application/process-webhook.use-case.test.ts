import { describe, it, expect, vi } from 'vitest'
import { ProcessWebhookUseCase } from './process-webhook.use-case.js'
import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'
import type { AnalysisRepository } from '../domain/ports/analysis-repository.port'

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
    // El CAS atómico devuelve true cuando la orden se actualizó de verdad.
    updateStatus: vi.fn().mockResolvedValue(true),
    // Acreditación atómica (RPC confirm_order_paid): 'paid' + créditos en una tx.
    confirmPaid: vi.fn().mockResolvedValue(true),
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

function mockAnalysisRepository(overrides?: Partial<AnalysisRepository>): AnalysisRepository {
  return {
    markCompleted: vi.fn().mockResolvedValue(undefined),
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
      mockAnalysisRepository(),
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
      mockAnalysisRepository(),
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=badhash', 'req-123'))
      .rejects.toThrow('Firma inválida')
    expect(paymentGateway.verifyWebhook).toHaveBeenCalledWith('ts=123,v1=badhash', validBody(), 'req-123')
  })

  it('skips processing when type is not payment', async () => {
    const paymentGateway = mockPaymentGateway()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
      mockAnalysisRepository(),
    )

    const result = await useCase.execute(validBody('plan'), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true })
  })

  it('throws when payment ID is missing', async () => {
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      mockOrderRepository(),
      mockCreditRepository(),
      mockAnalysisRepository(),
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
      mockAnalysisRepository(),
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=hash'))
      .rejects.toThrow('Sin referencia externa')
  })

  it('marks analysis as completed when externalRef starts with unlock_', async () => {
    // El externalRef real lo genera /v1/unlock como `unlock_<uuid>`.
    const analysisId = '123e4567-e89b-12d3-a456-426614174000'
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'approved',
        externalRef: `unlock_${analysisId}`,
      }),
    })
    const analysisRepo = mockAnalysisRepository()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
      analysisRepo,
    )

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, unlock: true, analysisId })
    expect(analysisRepo.markCompleted).toHaveBeenCalledWith(analysisId)
  })

  // El path de unlock_ no debe tocar la tabla de órdenes: si lo hiciera con un
  // externalRef `unlock_<uuid>` buscaría una orden con ese id y acreditaría
  // créditos a quien no compró un plan.
  it('no consulta órdenes cuando el externalRef es de unlock', async () => {
    const analysisId = '123e4567-e89b-12d3-a456-426614174000'
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'approved',
        externalRef: `unlock_${analysisId}`,
      }),
    })
    const orderRepo = mockOrderRepository()
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      orderRepo,
      creditRepo,
      mockAnalysisRepository(),
    )

    await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(orderRepo.findByExternalRef).not.toHaveBeenCalled()
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
  })

  // El UUID se valida también en el path de unlock: sin esto, un externalRef
  // `unlock_<basura>` llegaba a markCompleted con un id arbitrario.
  it('rechaza un unlock_ con id que no es UUID y no marca el análisis', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'approved',
        externalRef: 'unlock_no-es-un-uuid',
      }),
    })
    const analysisRepo = mockAnalysisRepository()
    const orderRepo = mockOrderRepository()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      orderRepo,
      mockCreditRepository(),
      analysisRepo,
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=hash'))
      .rejects.toThrow('externalRef inválido')
    expect(analysisRepo.markCompleted).not.toHaveBeenCalled()
    expect(orderRepo.findByExternalRef).not.toHaveBeenCalled()
  })

  // Regresión crítica: MercadoPago notifica también pagos rechazados y
  // pendientes. Antes, cualquier evento con externalRef unlock_* liberaba el
  // reporte (markCompleted) sin cobrar.
  it('no desbloquea el reporte si el pago fue rechazado', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'rejected',
        externalRef: 'unlock_analysis-123',
      }),
    })
    const analysisRepo = mockAnalysisRepository()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
      analysisRepo,
    )

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, unlock: false, status: 'rejected' })
    expect(analysisRepo.markCompleted).not.toHaveBeenCalled()
  })

  it('no desbloquea el reporte si el pago sigue pendiente', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'pending',
        externalRef: 'unlock_analysis-123',
      }),
    })
    const analysisRepo = mockAnalysisRepository()
    const useCase = new ProcessWebhookUseCase(
      paymentGateway,
      mockOrderRepository(),
      mockCreditRepository(),
      analysisRepo,
    )

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, unlock: false, status: 'pending' })
    expect(analysisRepo.markCompleted).not.toHaveBeenCalled()
  })

  it('rechaza un externalRef de orden que no es UUID', async () => {
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
      mockAnalysisRepository(),
    )

    await expect(useCase.execute(validBody(), 'ts=123,v1=hash'))
      .rejects.toThrow('externalRef inválido')
  })

  it('marks order as paid and adds credits when payment is approved', async () => {
    const paymentGateway = mockPaymentGateway()
    const orderRepo = mockOrderRepository()
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo, mockAnalysisRepository())

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'approved' })
    // Un único camino atómico: la orden pasa a 'paid' y los créditos se suman
    // dentro de la misma transacción en la base.
    expect(orderRepo.confirmPaid).toHaveBeenCalledTimes(1)
    expect(orderRepo.confirmPaid).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      {
        mpPaymentId: 'pay-12345',
        mpStatus: 'approved',
        mpDetail: 'accredited',
      },
      'pending',
    )
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
    expect(orderRepo.updateStatus).not.toHaveBeenCalled()
  })

  // Un pago sigue en curso (in_process): la orden queda 'pending' y no se
  // acredita nada, pero la transición sí se persiste para auditoría.
  it('deja la orden en pending y no acredita cuando el pago aún no es terminal', async () => {
    const paymentGateway = mockPaymentGateway({
      getPaymentStatus: vi.fn().mockResolvedValue({
        status: 'in_process',
        statusDetail: 'pending_contingency',
        externalRef: '550e8400-e29b-41d4-a716-446655440000',
      }),
    })
    const orderRepo = mockOrderRepository()
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo, mockAnalysisRepository())

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'in_process' })
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      {
        status: 'pending',
        mp_payment_id: 'pay-12345',
        mp_status: 'in_process',
        mp_detail: 'pending_contingency',
      },
      'pending',
    )
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
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
    const useCase = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo, mockAnalysisRepository())

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'rejected' })
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ status: 'failed' }),
      'pending',
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
      mockAnalysisRepository(),
    )

    await useCase.execute(validBody(), 'ts=123,v1=hash')

    // 'paid' es terminal: no se reescribe la orden ni se acredita de nuevo.
    expect(orderRepo.updateStatus).not.toHaveBeenCalled()
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
  })

  // Regresión: un pago aprobado sobre una orden que había quedado 'failed'
  // (intento previo rechazado) cobraba pero no acreditaba nada.
  it('acredita créditos cuando la orden estaba failed y llega un pago aprobado', async () => {
    const orderRepo = mockOrderRepository()
    orderRepo.setOrder({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: 'user-1',
      credits_purchased: 5,
      status: 'failed',
      plan: 'plus',
    })
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      orderRepo,
      creditRepo,
      mockAnalysisRepository(),
    )

    await useCase.execute(validBody(), 'ts=123,v1=hash')

    // El CAS debe usar el estado leído ('failed'), no resetear a 'pending'.
    expect(orderRepo.confirmPaid).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ mpPaymentId: 'pay-12345' }),
      'failed',
    )
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
  })

  // Regresión: dos webhooks concurrentes leían 'pending' y ambos acreditaban.
  it('no acredita si otro webhook ya ganó la carrera (CAS sin filas afectadas)', async () => {
    const orderRepo = mockOrderRepository()
    const confirmPaid = vi.fn().mockResolvedValue(false)
    orderRepo.confirmPaid = confirmPaid
    const creditRepo = mockCreditRepository()
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      orderRepo,
      creditRepo,
      mockAnalysisRepository(),
    )

    await useCase.execute(validBody(), 'ts=123,v1=hash')

    // Debe intentar el CAS contra el estado leído; sólo el resultado false
    // evita la acreditación (no un early-return previo).
    expect(confirmPaid).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ mpPaymentId: 'pay-12345' }),
      'pending',
    )
    expect(creditRepo.addCredits).not.toHaveBeenCalled()
  })

  it('returns received even when order is not found', async () => {
    const orderRepo = mockOrderRepository()
    orderRepo.setOrder(null)
    const useCase = new ProcessWebhookUseCase(
      mockPaymentGateway(),
      orderRepo,
      mockCreditRepository(),
      mockAnalysisRepository(),
    )

    const result = await useCase.execute(validBody(), 'ts=123,v1=hash')

    expect(result).toEqual({ received: true, status: 'approved' })
  })
})
