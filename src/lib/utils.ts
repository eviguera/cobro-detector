import { SEVERITY, ANOMALY_TYPES, ANALYSIS_STATUS } from './constants'

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function getSeverityLabel(severity: string): string {
  return SEVERITY[severity]?.label ?? severity
}

export function getAnomalyTypeLabel(type: string): string {
  return ANOMALY_TYPES[type] ?? type
}

export function getStatusLabel(status: string): string {
  return ANALYSIS_STATUS[status] ?? status
}
