import { describe, it, expect, vi } from 'vitest'
import { SupabasePaymentEventRepositoryAdapter } from './supabase-payment-event-repository.adapter.js'

function adapterWithRpc(result: { data?: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { adapter: new SupabasePaymentEventRepositoryAdapter({ rpc } as never), rpc }
}

describe('SupabasePaymentEventRepositoryAdapter.record', () => {
  it('registra vía RPC record_payment_event y devuelve true la primera vez', async () => {
    const { adapter, rpc } = adapterWithRpc({ data: true, error: null })

    const inserted = await adapter.record('pay-123', 'payment', '550e8400-e29b-41d4-a716-446655440000')

    expect(inserted).toBe(true)
    expect(rpc).toHaveBeenCalledWith('record_payment_event', {
      p_mp_payment_id: 'pay-123',
      p_event_type: 'payment',
      p_order_id: '550e8400-e29b-41d4-a716-446655440000',
      p_analysis_id: null,
      p_payload: null,
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('pasa analysis_id en el evento de unlock y normaliza los opcionales a null', async () => {
    const { adapter, rpc } = adapterWithRpc({ data: true, error: null })

    await adapter.record('pay-123', 'unlock', undefined, '123e4567-e89b-12d3-a456-426614174000')

    expect(rpc).toHaveBeenCalledWith('record_payment_event', {
      p_mp_payment_id: 'pay-123',
      p_event_type: 'unlock',
      p_order_id: null,
      p_analysis_id: '123e4567-e89b-12d3-a456-426614174000',
      p_payload: null,
    })
  })

  // Regresión: ON CONFLICT DO NOTHING en la base devuelve false cuando el
  // pago ya tenía evento; el adapter debe reflejarlo (no lanzar ni true).
  it('devuelve false cuando el pago ya existía (webhook duplicado)', async () => {
    const { adapter } = adapterWithRpc({ data: false, error: null })

    await expect(adapter.record('pay-123', 'payment')).resolves.toBe(false)
  })

  // Si el registro falla, el webhook debe responder 5xx (MercadoPago
  // reintenta) en vez de dar por procesado un pago sin evento.
  it('lanza si la RPC de registro falla', async () => {
    const { adapter } = adapterWithRpc({ data: null, error: { message: 'boom' } })

    await expect(adapter.record('pay-123', 'payment'))
      .rejects.toThrow('Error recording payment event: boom')
  })
})

describe('SupabasePaymentEventRepositoryAdapter.isProcessed', () => {
  it('consulta la RPC is_payment_event_processed con el id de pago', async () => {
    const { adapter, rpc } = adapterWithRpc({ data: true, error: null })

    await expect(adapter.isProcessed('pay-123')).resolves.toBe(true)
    expect(rpc).toHaveBeenCalledWith('is_payment_event_processed', {
      p_mp_payment_id: 'pay-123',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('devuelve false cuando el pago no tiene evento registrado', async () => {
    const { adapter } = adapterWithRpc({ data: false, error: null })

    await expect(adapter.isProcessed('pay-123')).resolves.toBe(false)
  })

  it('lanza si la RPC de consulta falla', async () => {
    const { adapter } = adapterWithRpc({ data: null, error: { message: 'boom' } })

    await expect(adapter.isProcessed('pay-123'))
      .rejects.toThrow('Error checking payment event: boom')
  })
})
