import { markAnalysisFailed } from '@/infrastructure/adapters/supabase-storage'

const mockRpc = jest.fn()

// El adapter usa el cliente browser para llamar a la RPC; se mockea entero
// para no depender de @supabase/ssr ni de variables de entorno.
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc: mockRpc }),
}))

describe('markAnalysisFailed', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('marca el error vía RPC mark_analysis_failed (no con UPDATE directo)', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    await markAnalysisFailed('analysis-1')

    expect(mockRpc).toHaveBeenCalledWith('mark_analysis_failed', {
      p_analysis_id: 'analysis-1',
    })
  })

  it('no lanza si la RPC falla: loggea el error y deja que el flujo siga', async () => {
    // Regresión: antes se hacía update() sin revisar `error`; PostgREST
    // resuelve con {error} en vez de lanzar, así que el .catch() del caller
    // (submit-analysis) nunca se enteraba y el análisis quedaba "processing".
    mockRpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(markAnalysisFailed('analysis-1')).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  it('loggea warning si la RPC no actualizó (no existe, ajeno o ya completado)', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    await expect(markAnalysisFailed('analysis-1')).resolves.toBeUndefined()

    expect(console.warn).toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })
})
