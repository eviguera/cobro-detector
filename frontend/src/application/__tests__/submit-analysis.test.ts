import { submitAnalysis, NoCreditsError, AnalysisFailedError } from '../submit-analysis'
import { ApiError } from '@/infrastructure/http/client'

jest.mock('@/infrastructure/adapters/supabase-storage', () => ({
  uploadFileToStorage: jest.fn(),
  createAnalysisRecord: jest.fn(),
  deleteAnalysisRecord: jest.fn(),
  markAnalysisFailed: jest.fn(),
}))

jest.mock('@/infrastructure/http/analysis-api', () => ({
  runAnalysis: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const storage = require('@/infrastructure/adapters/supabase-storage')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const analysisApi = require('@/infrastructure/http/analysis-api')

const UPLOAD = {
  signedUrl: 'http://127.0.0.1:54321/storage/v1/object/sign/analyses/x.pdf',
  storagePath: 'user-1/x.pdf',
  ivBase64: 'iv',
  encryptionKeyBase64: 'key',
}

function params() {
  return { file: new File(['x'], 'x.pdf', { type: 'application/pdf' }), userId: 'user-1', isPlatino: false }
}

describe('submitAnalysis — cobro de créditos en el backend', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storage.uploadFileToStorage.mockResolvedValue(UPLOAD)
    storage.createAnalysisRecord.mockResolvedValue('analysis-1')
    storage.deleteAnalysisRecord.mockResolvedValue(undefined)
    storage.markAnalysisFailed.mockResolvedValue(undefined)
  })

  it('ya no consume crédito desde el navegador (solo el backend cobra)', async () => {
    analysisApi.runAnalysis.mockResolvedValue({ analysisId: 'analysis-1' })

    await submitAnalysis(params())

    // El módulo de storage ya no expone consumeCredit; si alguien lo reintroduce
    // como llamada desde el cliente, este test no lo detectaría: se protege con
    // el grant REVOKE en la base. Aquí verificamos que no se borra nada.
    expect(storage.deleteAnalysisRecord).not.toHaveBeenCalled()
    expect(analysisApi.runAnalysis).toHaveBeenCalledWith(
      'analysis-1',
      expect.objectContaining({ storagePath: 'user-1/x.pdf' }),
      undefined,
    )
  })

  // Regresión: sin créditos el backend responde 402. Antes el error se
  // propagaba como AnalysisFailedError y dejaba un análisis huérfano.
  it('ante un 402 limpia el análisis y lanza NoCreditsError', async () => {
    analysisApi.runAnalysis.mockRejectedValue(new ApiError('Sin créditos disponibles', 402))

    await expect(submitAnalysis(params())).rejects.toBeInstanceOf(NoCreditsError)
    expect(storage.deleteAnalysisRecord).toHaveBeenCalledWith('analysis-1', 'user-1/x.pdf')
    expect(storage.markAnalysisFailed).toHaveBeenCalledWith('analysis-1')
  })

  it('ante un error 500 marca el análisis como fallido y lanza AnalysisFailedError', async () => {
    analysisApi.runAnalysis.mockRejectedValue(new ApiError('boom', 500))

    await expect(submitAnalysis(params())).rejects.toBeInstanceOf(AnalysisFailedError)
    expect(storage.markAnalysisFailed).toHaveBeenCalledWith('analysis-1')
    expect(storage.deleteAnalysisRecord).not.toHaveBeenCalled()
  })

  it('en un abort no marca el análisis como fallido', async () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    analysisApi.runAnalysis.mockRejectedValue(abort)

    await expect(submitAnalysis(params())).rejects.toThrow('aborted')
    expect(storage.markAnalysisFailed).not.toHaveBeenCalled()
  })
})
