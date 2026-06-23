import { uploadFileToStorage, createAnalysisRecord, consumeCredit } from '@/infrastructure/adapters/supabase-storage'
import { runAnalysis } from '@/infrastructure/http/analysis-api'
import type { AnalysisRunResponse } from '@/domain'

export class NoCreditsError extends Error {
  constructor() {
    super('Sin créditos disponibles')
    this.name = 'NoCreditsError'
  }
}

export interface SubmitAnalysisParams {
  file: File
  userId: string
  isPlatino: boolean
}

export async function submitAnalysis(params: SubmitAnalysisParams): Promise<AnalysisRunResponse> {
  const { file, userId, isPlatino } = params

  const fileUrl = await uploadFileToStorage(file, userId)

  const analysisId = await createAnalysisRecord(userId, file.name, file.type, fileUrl, isPlatino)

  if (!isPlatino) {
    const consumed = await consumeCredit(userId)
    if (!consumed) {
      throw new NoCreditsError()
    }
  }

  try {
    const result = await runAnalysis(analysisId)
    return result
  } catch {
    return {
      analysisId,
      status: 'processing',
      totalTransactions: 0,
      anomaliesCount: 0,
      recoverableAmount: 0,
      summary: '',
      bank: '',
    }
  }
}
