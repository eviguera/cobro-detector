import type { ParsedTransaction, DetectedAnomaly } from './analysis-result.types'

export interface AnalysisResult {
  anomalies: DetectedAnomaly[]
  totalTransactions: number
  totalRecoverable: number
  period?: { start: string; end: string }
  bank?: string
  aiSummary?: string
  success?: boolean
  error?: string
  transactions?: ParsedTransaction[]
}

export type { ParsedTransaction, DetectedAnomaly }
