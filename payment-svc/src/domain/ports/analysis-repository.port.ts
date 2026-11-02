export interface AnalysisRepository {
  markCompleted(analysisId: string): Promise<void>
}
