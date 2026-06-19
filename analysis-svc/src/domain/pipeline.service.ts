import type { ParsedTransaction, DetectedAnomaly } from './analysis-result.entity'
import type { AnalysisResult } from './analysis-result.entity'
import type { AiProvider } from './ports/ai-provider.port'
import type { FileParser } from './ports/parser.port'

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
      const bank = this.parser.detectBank(transactions)

      const aiResult = await this.aiProvider.analyze(transactions, bank)

      const ruleAnomalies = this.detectAnomaliesRules(transactions)
      const labeledAnomalies = this.detectLabeledAnomalies(transactions)

      const allAnomalies = this.deduplicateAnomalies([
        ...ruleAnomalies,
        ...labeledAnomalies,
        ...aiResult.anomalies as unknown as DetectedAnomaly[],
      ])

      const dates = transactions.map(tx => tx.date).sort()
      const period = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : undefined

      const totalRecoverable = allAnomalies.reduce((sum, a) => sum + a.recoverableAmount, 0)

      return {
        anomalies: allAnomalies,
        totalTransactions: transactions.length,
        totalRecoverable,
        period,
        bank,
        aiSummary: aiResult.summary || undefined,
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

  private detectAnomaliesRules(transactions: ParsedTransaction[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = []
    const grouped: Record<string, ParsedTransaction[]> = {}

    for (const tx of transactions) {
      const key = `${tx.description}|${tx.amount}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(tx)
    }

    for (const key of Object.keys(grouped)) {
      const group = grouped[key]
      if (group.length > 1) {
        const [description, amountStr] = key.split('|')
        const amount = Number(amountStr)
        anomalies.push({
          type: 'duplicate_commission',
          severity: 'high',
          title: 'Comisión duplicada',
          description: `Se detectó "${description}" ${group.length} veces por $${amount.toLocaleString('es-CL')} cada una`,
          detail: `Cobro duplicado o múltiple de "${description}"`,
          recoverableAmount: amount * (group.length - 1),
          transactionRefs: group.map(tx => tx.id ?? ''),
        })
      }
    }

    return anomalies
  }

  private detectLabeledAnomalies(transactions: ParsedTransaction[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = []
    const knownLabels = [
      'comisión', 'comision', 'mantención', 'mantencion',
      'administración', 'administracion', 'seguro',
      'cargo fijo', 'anualidad', 'suscripción', 'suscripcion',
    ]

    for (const tx of transactions) {
      const desc = (tx.description ?? '').toLowerCase()
      const matched = knownLabels.find(l => desc.includes(l))
      if (matched) {
        anomalies.push({
          type: 'unknown_charge',
          severity: 'medium',
          title: `Posible cargo etiquetado: "${matched}"`,
          description: `"${tx.description}" el ${tx.date} por $${(tx.amount ?? 0).toLocaleString('es-CL')}`,
          detail: `Cargo con etiqueta sospechosa: "${matched}"`,
          recoverableAmount: tx.amount ?? 0,
          transactionRefs: [tx.id ?? ''],
        })
      }
    }

    return anomalies
  }

  private deduplicateAnomalies(anomalies: DetectedAnomaly[]): DetectedAnomaly[] {
    const union = new Map<string, DetectedAnomaly>()

    for (const anomaly of anomalies) {
      const key = `${anomaly.type}|${anomaly.title}|${anomaly.recoverableAmount}`
      if (union.has(key)) {
        const existing = union.get(key)!
        existing.recoverableAmount += anomaly.recoverableAmount
        existing.transactionRefs = [...new Set([...existing.transactionRefs, ...anomaly.transactionRefs])]
      } else {
        union.set(key, { ...anomaly, transactionRefs: [...anomaly.transactionRefs] })
      }
    }

    return Array.from(union.values())
  }
}
