import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
  const map: Record<string, string> = {
    high: 'Alta prioridad',
    medium: 'Media prioridad',
    low: 'Baja prioridad',
  }
  return map[severity] ?? severity
}

export function getAnomalyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    duplicate_commission: 'Comisión duplicada',
    installment_error: 'Error en cuotas',
    unknown_charge: 'Cargo no reconocido',
    incorrect_charge: 'Cobro incorrecto',
  }
  return map[type] ?? type
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    claimed: 'Reclamado',
    recovered: 'Recuperado',
    dismissed: 'Descartado',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Error',
  }
  return map[status] ?? status
}
