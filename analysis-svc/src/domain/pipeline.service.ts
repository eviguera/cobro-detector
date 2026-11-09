import type { ParsedTransaction, DetectedAnomaly } from './analysis-result.entity'
import type { AnalysisResult } from './analysis-result.entity'
import type { AiProvider } from './ports/ai-provider.port'
import type { FileParser } from './ports/parser.port'
import {
  buildDeterministicSummary,
  detectRuleAnomalies,
  mergeAnomalies,
  normalizeAiAnomalies,
} from './anomaly-rules'

export interface PipelineOptions {
  userId?: string
  companyId?: string
  fileName?: string
}

export class PipelineService {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly parser: FileParser,
  ) {}

  async run(
    buffer: Buffer,
    fileType: string,
    _options?: PipelineOptions,
  ): Promise<AnalysisResult> {
    try {
      const transactions = await this.parser.parseTransactions(buffer, fileType)

      // Un archivo del que no se pudo extraer ni un movimiento no es una
      // cartola "limpia": es un formato no soportado. Devolver 0 hallazgos
      // haría creer al usuario que el banco no le cobró de más.
      if (transactions.length === 0) {
        return {
          anomalies: [],
          totalTransactions: 0,
          totalRecoverable: 0,
          success: false,
          error:
            'No pudimos detectar movimientos en el archivo. Verifica que sea la cartola original del banco (PDF, Excel o CSV) e inténtalo de nuevo.',
        }
      }

      const bank = this.parser.detectBank(transactions)

      // La IA es una capa adicional, no un requisito: si falla o se degrada,
      // el análisis determinístico sigue siendo válido y el usuario recibe
      // resultados en vez de un error.
      let aiAnomalies: DetectedAnomaly[] = []
      let aiSummary = ''

      try {
        const aiResult = await this.aiProvider.analyze(transactions, bank)
        aiAnomalies = normalizeAiAnomalies(aiResult.anomalies, transactions)
        aiSummary = aiResult.summary?.trim() ?? ''
      } catch (error) {
        console.error(
          'AI provider failed; continuing with deterministic rules:',
          error instanceof Error ? error.message : String(error),
        )
      }

      const ruleAnomalies = detectRuleAnomalies(transactions)
      const allAnomalies = mergeAnomalies(ruleAnomalies, aiAnomalies)

      const dates = transactions.map((tx) => tx.date).filter(Boolean).sort()
      const period = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : undefined

      // Los montos recuperables siempre son positivos y ya vienen sin doble
      // conteo desde mergeAnomalies.
      const totalRecoverable = allAnomalies.reduce(
        (sum, anomaly) => sum + Math.abs(anomaly.recoverableAmount),
        0,
      )

      const summaryIsUseful =
        aiSummary.length >= 30 && !/no se pudo completar/i.test(aiSummary)

      return {
        anomalies: allAnomalies,
        totalTransactions: transactions.length,
        totalRecoverable,
        period,
        bank,
        aiSummary: summaryIsUseful
          ? aiSummary
          : buildDeterministicSummary(allAnomalies, transactions.length, bank),
        transactions,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido en pipeline'
      return {
        anomalies: [],
        totalTransactions: 0,
        totalRecoverable: 0,
        success: false,
        error: errorMsg,
      }
    }
  }
}
