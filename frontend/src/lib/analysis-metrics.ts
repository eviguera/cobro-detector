/**
 * Métricas de análisis unificadas.
 *
 * Regla de negocio: los análisis con status `error` o `failed` nunca deben sumar
 * dinero recuperable ni anomalías. Antes cada página filtraba (o no) por su
 * cuenta y por eso el dashboard mostraba cifras distintas al historial y a
 * analytics.
 */

export const INVALID_ANALYSIS_STATUSES = ['error', 'failed'] as const

type StatusLike = { status?: string | null }

/** True si el análisis cuenta para las métricas del usuario. */
export function isValidAnalysis(row: StatusLike): boolean {
  return !INVALID_ANALYSIS_STATUSES.includes(
    (row.status ?? '') as (typeof INVALID_ANALYSIS_STATUSES)[number]
  )
}

export function filterValidAnalyses<T extends StatusLike>(rows: T[] | null | undefined): T[] {
  if (!rows) return []
  return rows.filter(isValidAnalysis)
}

export function sumRecoverable(
  rows: Array<{ recoverable_amount?: number | null }>
): number {
  return rows.reduce((sum, row) => sum + (row.recoverable_amount ?? 0), 0)
}

export function sumAnomalies(rows: Array<{ anomalies_count?: number | null }>): number {
  return rows.reduce((sum, row) => sum + (row.anomalies_count ?? 0), 0)
}

export interface AnalysisMetrics {
  /** Análisis válidos (excluye error/failed). */
  analyses: number
  /** Análisis con status `completed`. */
  completed: number
  anomalies: number
  recoverable: number
}

export function buildAnalysisMetrics(
  rows: Array<{
    status?: string | null
    recoverable_amount?: number | null
    anomalies_count?: number | null
  }> | null | undefined
): AnalysisMetrics {
  const valid = filterValidAnalyses(rows)

  return {
    analyses: valid.length,
    completed: valid.filter((row) => row.status === 'completed').length,
    anomalies: sumAnomalies(valid),
    recoverable: sumRecoverable(valid),
  }
}
