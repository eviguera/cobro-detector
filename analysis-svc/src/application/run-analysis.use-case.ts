import { PipelineService, type PipelineOptions } from '../domain/pipeline.service'
import type { AnalysisRepository } from '../domain/ports/analysis.repository.port'
import type { FileParser } from '../domain/ports/parser.port'
import type { AiProvider } from '../domain/ports/ai-provider.port'
import type { AnalysisQueue } from '../domain/ports/queue.port'
import type { AnalysisResult } from '../domain/analysis-result.entity'

export interface AnalysisSyncResult {
  totalTransactions: number
  anomaliesCount: number
  recoverableAmount: number
  anomalies: unknown[]
  summary?: string
  bank?: string
  awaitingPayment: boolean
  paymentAmount?: number
}

export class RunAnalysisUseCase {
  constructor(
    private readonly pipeline: PipelineService,
    private readonly analysisRepo: AnalysisRepository,
    private readonly queue: AnalysisQueue,
  ) {}

  async executeSync(
    userId: string,
    analysisId: string,
    buffer: Buffer,
    fileType: string,
    fileName: string,
    isPlatino: boolean,
  ): Promise<AnalysisSyncResult> {
    await this.analysisRepo.updateStatus(analysisId, userId, 'processing')

    const result: AnalysisResult = await this.pipeline.run(buffer, fileType, {
      userId,
      fileName,
    })

    if (result.success === false) {
      throw new Error(result.error || 'El motor de análisis no pudo procesar el archivo')
    }

    await this.analysisRepo.storeResults(analysisId, userId, result, isPlatino)

    const anomalies = result.anomalies ?? []
    if (anomalies.length > 0) {
      const anomaliesToInsert = anomalies.map((anomaly) => ({
        analysis_id: analysisId,
        user_id: userId,
        type: anomaly.type as string,
        severity: anomaly.severity as string,
        title: anomaly.title as string,
        description: anomaly.description as string,
        detail: (anomaly.detail as string) ?? null,
        recoverable_amount: anomaly.recoverableAmount as number,
        transaction_refs: anomaly.transactionRefs as string[],
        status: 'pending' as string,
      }))
      await this.analysisRepo.insertAnomalies(analysisId, userId, anomaliesToInsert)
    }

    return {
      totalTransactions: result.totalTransactions ?? 0,
      anomaliesCount: anomalies.length,
      recoverableAmount: result.totalRecoverable ?? 0,
      anomalies,
      summary: result.aiSummary ?? undefined,
      bank: result.bank ?? undefined,
      awaitingPayment: isPlatino,
      paymentAmount: isPlatino ? Math.round((result.totalRecoverable ?? 0) * 0.2) : undefined,
    }
  }

  async executeAsync(
    userId: string,
    analysisId: string,
    fileUrl: string,
    fileType: string,
    fileName: string,
  ): Promise<void> {
    await this.queue.enqueue({
      userId,
      fileName,
      filePath: fileUrl,
      fileType,
      companyId: null,
      analysisId,
    })
  }
}
