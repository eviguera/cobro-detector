import { uploadFileToStorage, createAnalysisRecord, consumeCredit, deleteAnalysisRecord, markAnalysisFailed } from '@/infrastructure/adapters/supabase-storage'
import { runAnalysis } from '@/infrastructure/http/analysis-api'
import type { AnalysisRunResponse } from '@/domain'

export class NoCreditsError extends Error {
  constructor() {
    super('Sin créditos disponibles')
    this.name = 'NoCreditsError'
  }
}

export class AnalysisFailedError extends Error {
  constructor(
    public readonly analysisId: string,
    message: string,
  ) {
    super(message)
    this.name = 'AnalysisFailedError'
  }
}

export interface SubmitAnalysisParams {
  file: File
  userId: string
  isPlatino: boolean
  signal?: AbortSignal
}

export async function submitAnalysis(params: SubmitAnalysisParams): Promise<AnalysisRunResponse> {
  const { file, userId, isPlatino, signal } = params

  const fileUrl = await uploadFileToStorage(file, userId)

  const analysisId = await createAnalysisRecord(userId, file.name, file.type, fileUrl, isPlatino)

  if (!isPlatino) {
    const consumed = await consumeCredit(userId)
    if (!consumed) {
      // No dejar un análisis huérfano en el historial cuando no hay créditos.
      await deleteAnalysisRecord(analysisId).catch(() => {})
      throw new NoCreditsError()
    }
  }

  try {
    return await runAnalysis(analysisId, signal)
  } catch (error) {
    // En un abort (cancelación o timeout) el backend puede seguir procesando:
    // no marcamos error para no pisar un resultado que sí llegue a guardarse.
    const aborted = error instanceof Error && error.name === 'AbortError'
    if (!aborted) {
      await markAnalysisFailed(analysisId).catch(() => {})
    }

    // Antes se devolvía un resultado "exitoso" con ceros, así que la UI
    // mostraba "Análisis completado" aunque el servicio hubiera fallado.
    throw new AnalysisFailedError(
      analysisId,
      error instanceof Error ? error.message : 'Error al analizar el archivo',
    )
  }
}
