import type { Analysis } from '../analysis.entity'
import type { AnalysisResult } from '../analysis-result.entity'

export interface AnalysisRepository {
  create(userId: string, fileName: string, fileType: string, fileUrl: string, companyId: string | null): Promise<string>
  updateStatus(analysisId: string, userId: string, status: string): Promise<void>
  storeResults(analysisId: string, userId: string, result: AnalysisResult, isPlatino: boolean): Promise<void>
  insertAnomalies(analysisId: string, userId: string, anomalies: Array<Record<string, unknown>>): Promise<void>
  markError(analysisId: string, userId: string): Promise<void>
  getCreditsLeft(userId: string): Promise<number>
}
