import type { ParsedTransaction } from '../analysis-result.entity'

export interface AiResult {
  anomalies: Array<Record<string, unknown>>
  summary: string
  degraded?: boolean
}

export interface AiProvider {
  analyze(transactions: ParsedTransaction[], bank: string): Promise<AiResult>
}
