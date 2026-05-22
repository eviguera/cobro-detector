import { consumeCreditAtomic } from '../credit.service'

function mockSupabase(rpcResult: any, rpcError: any = null) {
  const calls: string[] = []
  return {
    rpc: jest.fn().mockResolvedValue({ data: rpcResult, error: rpcError }),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }
}

describe('consumeCreditAtomic', () => {
  it('returns true when RPC succeeds with true', async () => {
    const supabase = mockSupabase(true)

    const result = await consumeCreditAtomic(supabase as any, 'user-1')

    expect(result).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('consume_credit', {
      p_company_id: null,
    })
  })

  it('returns false when RPC succeeds with false', async () => {
    const supabase = mockSupabase(false)

    const result = await consumeCreditAtomic(supabase as any, 'user-1')

    expect(result).toBe(false)
  })

  it('returns false when RPC returns no data', async () => {
    const supabase = mockSupabase(null)

    const result = await consumeCreditAtomic(supabase as any, 'user-1')

    expect(result).toBe(false)
  })

  it('falls back to CAS when RPC not found', async () => {
    const supabase = mockSupabase(null, { code: 'PGRST202', message: 'function not found' })
    supabase.single.mockResolvedValueOnce({
      data: { total: 5, used: 2 },
      error: null,
    })

    const result = await consumeCreditAtomic(supabase as any, 'user-1')

    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('credits')
  })

  it('returns false when CAS finds no credits row', async () => {
    const supabase = mockSupabase(null, { code: 'PGRST202' })
    supabase.single.mockResolvedValueOnce({ data: null, error: null })

    const result = await consumeCreditAtomic(supabase as any, 'user-1')

    expect(result).toBe(false)
  })

  it('returns false when CAS finds zero credits left', async () => {
    const supabase = mockSupabase(null, { code: 'PGRST202' })
    supabase.single.mockResolvedValueOnce({
      data: { total: 3, used: 3 },
      error: null,
    })

    const result = await consumeCreditAtomic(supabase as any, 'user-1')

    expect(result).toBe(false)
  })
})
