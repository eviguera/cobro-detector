// Banks — keyword → display name
export const BANKS: Record<string, string> = {
  santander: 'Banco Santander',
  bci: 'BCI',
  chile: 'Banco de Chile',
  estado: 'BancoEstado',
  itau: 'Itaú',
  itaú: 'Itaú',
  scotiabank: 'Scotiabank',
  scotia: 'Scotiabank',
  security: 'Banco Security',
  falabella: 'Banco Falabella',
  ripley: 'Banco Ripley',
  corpbanca: 'CorpBanca',
}

// Severity levels
export const SEVERITY: Record<string, { label: string; color: string; badgeStyle: string; borderStyle: string }> = {
  high: {
    label: 'Alta prioridad',
    color: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400',
    badgeStyle: 'background:#fef2f2;color:#dc2626;',
    borderStyle: 'border-left-color:#dc2626;',
  },
  medium: {
    label: 'Media prioridad',
    color: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400',
    badgeStyle: 'background:#fffbeb;color:#d97706;',
    borderStyle: 'border-left-color:#d97706;',
  },
  low: {
    label: 'Baja prioridad',
    color: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400',
    badgeStyle: 'background:#f9fafb;color:#6b7280;',
    borderStyle: 'border-left-color:#6b7280;',
  },
}

// Anomaly types
export const ANOMALY_TYPES: Record<string, string> = {
  duplicate_commission: 'Comisión duplicada',
  installment_error: 'Error en cuotas',
  unknown_charge: 'Cargo no reconocido',
  incorrect_charge: 'Cobro incorrecto',
}

// Analysis status
export const ANALYSIS_STATUS: Record<string, string> = {
  pending: 'Pendiente',
  claimed: 'Reclamado',
  recovered: 'Recuperado',
  dismissed: 'Descartado',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Error',
}


