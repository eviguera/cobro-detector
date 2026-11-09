import type { Finding } from './analysis-insights'
import type { DetectedAnomaly } from '@/domain'

/**
 * Clave estable de un hallazgo dentro de un análisis.
 * Se usa para feedback y para la selección de hallazgos del reporte.
 */
function selectionKey(
  type: string,
  title: string,
  amount: number,
  transactionRefs: string[]
): string {
  const ref = transactionRefs[0] ?? 'sin-ref'
  return `${type}|${title}|${amount}|${ref}`.slice(0, 240)
}

export function findingKey(
  finding: Pick<Finding, 'type' | 'title' | 'amount' | 'transactionRefs'>
): string {
  return selectionKey(finding.type, finding.title, finding.amount, finding.transactionRefs)
}

export function anomalyKey(
  anomaly: Pick<DetectedAnomaly, 'type' | 'title' | 'recoverableAmount' | 'transactionRefs'>
): string {
  return selectionKey(
    anomaly.type,
    anomaly.title,
    anomaly.recoverableAmount,
    anomaly.transactionRefs
  )
}
