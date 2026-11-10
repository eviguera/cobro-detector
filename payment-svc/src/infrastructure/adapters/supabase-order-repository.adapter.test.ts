import { describe, it, expect, vi } from 'vitest'
import { SupabaseOrderRepositoryAdapter } from './supabase-order-repository.adapter.js'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

/**
 * Stub mínimo del query builder de supabase-js:
 *   from(...).update(...).eq(...)[.eq(...)].select(...)
 * Registra los `.eq()` para poder verificar el filtro de compare-and-swap.
 */
function supabaseStub(result: QueryResult) {
  const eqCalls: Array<{ column: string; value: unknown }> = []
  const select = vi.fn().mockResolvedValue(result)
  const query: Record<string, unknown> = {}
  query.update = vi.fn(() => query)
  query.eq = vi.fn((column: string, value: unknown) => {
    eqCalls.push({ column, value })
    return query
  })
  query.select = select

  const from = vi.fn(() => query)
  return {
    client: { from } as never,
    from,
    select,
    eqCalls,
    updatePayload: () => (query.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0],
  }
}

const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('SupabaseOrderRepositoryAdapter.updateStatus (compare-and-swap)', () => {
  it('filtra por el estado esperado y devuelve true cuando actualizó una fila', async () => {
    const stub = supabaseStub({ data: [{ id: ORDER_ID }], error: null })
    const adapter = new SupabaseOrderRepositoryAdapter(stub.client)

    const applied = await adapter.updateStatus(ORDER_ID, { status: 'paid' }, 'pending')

    expect(applied).toBe(true)
    expect(stub.eqCalls).toEqual([
      { column: 'id', value: ORDER_ID },
      { column: 'status', value: 'pending' },
    ])
  })

  // Regresión: sin el filtro `.eq('status', expectedStatus)` el UPDATE pisa
  // siempre la fila, dos webhooks concurrentes devuelven "aplicado" y se
  // acreditan los créditos dos veces.
  it('devuelve false cuando ninguna fila coincide con el estado esperado', async () => {
    const stub = supabaseStub({ data: [], error: null })
    const adapter = new SupabaseOrderRepositoryAdapter(stub.client)

    const applied = await adapter.updateStatus(ORDER_ID, { status: 'paid' }, 'pending')

    expect(applied).toBe(false)
  })

  // Si el update falla, el webhook debe fallar (MercadoPago reintenta) en vez
  // de responder 200 y perder la acreditación.
  it('lanza cuando Supabase devuelve error', async () => {
    const stub = supabaseStub({ data: null, error: { message: 'connection reset' } })
    const adapter = new SupabaseOrderRepositoryAdapter(stub.client)

    await expect(adapter.updateStatus(ORDER_ID, { status: 'paid' }, 'pending'))
      .rejects.toThrow('Error updating order: connection reset')
  })

  it('no filtra por status cuando no se pide compare-and-swap', async () => {
    const stub = supabaseStub({ data: null, error: null })
    const adapter = new SupabaseOrderRepositoryAdapter(stub.client)

    const applied = await adapter.updateStatus(ORDER_ID, { mp_preference_id: 'pref-1' })

    expect(applied).toBe(true)
    expect(stub.eqCalls).toEqual([{ column: 'id', value: ORDER_ID }])
  })

  it('envía el payload completo del webhook al update', async () => {
    const stub = supabaseStub({ data: [{ id: ORDER_ID }], error: null })
    const adapter = new SupabaseOrderRepositoryAdapter(stub.client)

    await adapter.updateStatus(ORDER_ID, {
      status: 'paid',
      mp_payment_id: 'pay-12345',
      mp_status: 'approved',
      mp_detail: 'accredited',
    }, 'pending')

    expect(stub.updatePayload()).toEqual({
      status: 'paid',
      mp_payment_id: 'pay-12345',
      mp_status: 'approved',
      mp_detail: 'accredited',
    })
  })
})
