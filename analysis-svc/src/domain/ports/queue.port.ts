export interface QueueJob {
  userId: string
  fileName: string
  filePath: string
  fileType: string
  companyId: string | null
  analysisId: string
}

export interface AnalysisQueue {
  enqueue(job: QueueJob): Promise<void>
}
