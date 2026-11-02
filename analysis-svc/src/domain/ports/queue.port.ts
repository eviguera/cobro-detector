export interface QueueJob {
  userId: string
  fileName: string
  filePath: string
  fileType: string
  companyId: string | null
  analysisId: string
  // Metadatos de cifrado AES-256-GCM (opcional para retrocompatibilidad).
  storagePath?: string | null
  encryptionKeyIv?: string | null
  encryptionKeyBase64?: string | null
}

export interface AnalysisQueue {
  enqueue(job: QueueJob): Promise<void>
}
