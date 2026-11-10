import { describe, it, expect, vi } from 'vitest'
import { SupabaseCreditRepositoryAdapter } from './supabase-credit-repository.adapter.js'

function adapterWithRpc(result: { data?: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { adapter: new SupabaseCreditRepositoryAdapter({ rpc } as never), rpc }
}

describe('SupabaseCreditRepositoryAdapter.addCredits', () => {
  it('acredita vía RPC atómica (no lee y reescribe en el cliente)', async () => {
    const { adapter, rpc } = adapterWithRpc({ data: null, error: null })

    await adapter.addCredits('user-1', 5)

    expect(rpc).toHaveBeenCalledWith('add_credits', { p_user_id: 'user-1', p_amount: 5 })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  // Regresión: el adapter anterior ignoraba los errores y devolvía éxito
  // aunque la acreditación no se hubiera aplicado.
  it('lanza si la acreditación falla', async () => {
    const { adapter } = adapterWithRpc({ data: null, error: { message: 'boom' } })

    await expect(adapter.addCredits('user-1', 5)).rejects.toThrow('Error adding credits: boom')
  })
})
