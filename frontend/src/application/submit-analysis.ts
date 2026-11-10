import {
  uploadFileToStorage,
  createAnalysisRecord,
  deleteAnalysisRecord,
  markAnalysisFailed,
  type UploadResult,
} from '@/infrastructure/adapters/supabase-storage'
import { runAnalysis } from '@/infrastructure/http/analysis-api'
import { ApiError } from '@/infrastructure/http/client'
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

  // 1. Cifrar archivo antes de subir (AES-256-GCM)
  const upload: UploadResult = await uploadFileToStorage(file, userId)

  // 2. Crear registro de análisis con metadatos de cifrado y ruta de Storage
  const analysisId = await createAnalysisRecord(
    userId,
    file.name,
    file.type,
    upload.signedUrl,
    isPlatino,
    upload.storagePath,
    upload.ivBase64,
    upload.encryptionKeyBase64,
  )

  try {
    return await runAnalysis(analysisId, {
      storagePath: upload.storagePath,
      ivBase64: upload.ivBase64,
      encryptionKeyBase64: upload.encryptionKeyBase64,
    }, signal)
  } catch (error) {
    // Sin créditos: el backend responde 402 y no encola nada. Limpiamos el
    // registro y el archivo para no dejar basura en el historial.
    if (error instanceof ApiError && error.status === 402) {
      await markAnalysisFailed(analysisId).catch(() => {})
      await deleteAnalysisRecord(analysisId, upload.storagePath).catch(() => {})
      throw new NoCreditsError()
    }

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
