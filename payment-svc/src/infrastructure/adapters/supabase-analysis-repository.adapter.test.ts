import { describe, it, expect, vi } from 'vitest'
import { SupabaseAnalysisRepositoryAdapter } from './supabase-analysis-repository.adapter.js'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

/**
 * Stub mínimo del query builder de supabase-js:
 *   from(...).update(...).eq(id).eq(status).select(...)
 * Registra los `.eq()` para poder verificar el filtro de compare-and-swap.
 */
function supabaseStub(result: QueryResult) {
  const eqCalls: Array<{ column: string; value: unknown }> = []
  const query: Record<string, unknown> = {}
  query.update = vi.fn(() => query)
  query.eq = vi.fn((column: string, value: unknown) => {
    eqCalls.push({ column, value })
    return query
  })
  query.select = vi.fn().mockResolvedValue(result)

  const from = vi.fn(() => query)
  return {
    client: { from } as never,
    eqCalls,
    updatePayload: () => (query.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0],
  }
}

const ANALYSIS_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('SupabaseAnalysisRepositoryAdapter.markCompleted (compare-and-swap)', () => {
  it('completa solo un análisis en awaiting_payment y devuelve true', async () => {
    const stub = supabaseStub({ data: [{ id: ANALYSIS_ID }], error: null })
    const adapter = new SupabaseAnalysisRepositoryAdapter(stub.client)

    const applied = await adapter.markCompleted(ANALYSIS_ID)

    expect(applied).toBe(true)
    expect(stub.updatePayload()).toEqual({ status: 'completed' })
    expect(stub.eqCalls).toEqual([
      { column: 'id', value: ANALYSIS_ID },
      { column: 'status', value: 'awaiting_payment' },
    ])
  })

  // Regresión: el UPDATE anterior era incondicional, así que un webhook
  // duplicado de unlock volvía a escribir 'completed' sobre cualquier estado
  // (incluido un análisis en curso o con error) y devolvía "éxito".
  it('devuelve false cuando el análisis ya no está en awaiting_payment', async () => {
    const stub = supabaseStub({ data: [], error: null })
    const adapter = new SupabaseAnalysisRepositoryAdapter(stub.client)

    const applied = await adapter.markCompleted(ANALYSIS_ID)

    expect(applied).toBe(false)
  })

  // Si el update falla, el webhook debe responder 5xx (MercadoPago reintenta)
  // en vez de reportar un desbloqueo que no ocurrió.
  it('lanza cuando Supabase devuelve error', async () => {
    const stub = supabaseStub({ data: null, error: { message: 'connection reset' } })
    const adapter = new SupabaseAnalysisRepositoryAdapter(stub.client)

    await expect(adapter.markCompleted(ANALYSIS_ID))
      .rejects.toThrow('Error marking analysis completed: connection reset')
  })
})
