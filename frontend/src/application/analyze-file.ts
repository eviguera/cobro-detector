import { runAnalysis } from '@/infrastructure/http/analysis-api'

export interface StartAnalysisParams {
  analysisId: string
}

export interface AnalysisResult {
  analysisId: string
  status: string
  totalTransactions: number
  anomaliesCount: number
  recoverableAmount: number
  summary: string
  bank: string
}

export async function startAnalysis({ analysisId }: StartAnalysisParams): Promise<AnalysisResult> {
  return runAnalysis(analysisId)
}
