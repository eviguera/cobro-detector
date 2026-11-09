/**
 * Insights derivados de un análisis.
 *
 * Todo lo que hay aquí es cálculo determinístico sobre datos ya guardados
 * (anomalías + transacciones). No inventa benchmarks ni promedios de mercado:
 * si no hay evidencia suficiente, la confianza baja y se dice explícitamente.
 */

import { ANOMALY_TYPES, SEVERITY } from './constants'

export type Severity = 'high' | 'medium' | 'low'

export interface RawFinding {
  type?: unknown
  severity?: unknown
  title?: unknown
  description?: unknown
  detail?: unknown
  recoverableAmount?: unknown
  recoverable_amount?: unknown
  transactionRefs?: unknown
  transaction_refs?: unknown
  confidence?: unknown
}

export interface Finding {
  type: string
  severity: Severity
  title: string
  description: string
  detail: string | null
  amount: number
  transactionRefs: string[]
  /** 0–100: qué tan respaldado está el hallazgo por evidencia concreta. */
  confidence: number
}

export interface FindingGroup {
  type: string
  label: string
  count: number
  amount: number
  /** Porcentaje del monto total recuperable (0–100). */
  share: number
  severities: Record<Severity, number>
}

export interface ActionStep {
  title: string
  description: string
  tone: 'neutral' | 'warning' | 'success'
}

export interface AnalysisInsights {
  findings: Finding[]
  groups: FindingGroup[]
  recoverable: number
  /** Suma de los montos de los hallazgos (puede diferir del guardado). */
  findingsTotal: number
  /** Diferencia entre lo guardado y la suma de hallazgos (> $1 CLP). */
  hasDiscrepancy: boolean
  counts: Record<Severity, number> & { total: number }
  largest: Finding | null
  average: number
  priority: 'alta' | 'media' | 'baja' | 'ninguna'
  priorityReason: string
  confidence: number
  confidenceBreakdown: {
    coverage: number
    evidence: number
    context: number
    ai: number
  }
  confidenceLabel: 'alta' | 'media' | 'baja'
  actionPlan: ActionStep[]
}

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

function asSeverity(value: unknown): Severity {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low'
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value)
  if (typeof value === 'string') {
    // Formato chileno: "12.345" son doce mil trescientos cuarenta y cinco.
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
    const parsed = Number(cleaned)
    if (Number.isFinite(parsed)) return Math.abs(parsed)
  }
  return 0
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/**
 * Normaliza una anomalía tal como viene del JSON de la DB (camelCase) o de
 * una respuesta de microservicio (snake_case). Devuelve null si no hay título
 * ni monto que mostrar, para no ensuciar el reporte con filas vacías.
 */
export function normalizeFinding(raw: unknown): Finding | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as RawFinding

  const title = typeof item.title === 'string' ? item.title.trim() : ''
  const amount = asNumber(item.recoverableAmount ?? item.recoverable_amount)
  if (!title && amount === 0) return null

  const severity = asSeverity(item.severity)
  const transactionRefs = asStringArray(item.transactionRefs ?? item.transaction_refs)
  const detail = typeof item.detail === 'string' && item.detail.trim() ? item.detail.trim() : null

  // Confianza por hallazgo: si el motor de análisis ya la calculó, se respeta.
  // Si no, se estima con severidad + referencias verificables + detalle.
  let confidence = severity === 'high' ? 55 : severity === 'medium' ? 45 : 35
  if (transactionRefs.length > 0) confidence += 25
  if (detail) confidence += 10
  if (amount > 0) confidence += 10
  if (typeof item.confidence === 'number' && Number.isFinite(item.confidence)) {
    confidence = Math.max(0, Math.min(100, Math.round(item.confidence)))
  }

  return {
    type: typeof item.type === 'string' && item.type ? item.type : 'unknown_charge',
    severity,
    title: title || 'Cobro sin identificar',
    description:
      typeof item.description === 'string' && item.description.trim()
        ? item.description.trim()
        : 'Detectamos un cobro que no coincide con el patrón esperado.',
    detail,
    amount,
    transactionRefs,
    confidence: Math.min(confidence, 100),
  }
}

export function normalizeFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeFinding)
    .filter((finding): finding is Finding => finding !== null)
    .sort((a, b) => {
      const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      if (bySeverity !== 0) return bySeverity
      return b.amount - a.amount
    })
}

export function buildFindingGroups(findings: Finding[]): FindingGroup[] {
  const total = findings.reduce((sum, finding) => sum + finding.amount, 0)
  const byType = new Map<string, FindingGroup>()

  for (const finding of findings) {
    const current = byType.get(finding.type) ?? {
      type: finding.type,
      label: ANOMALY_TYPES[finding.type] ?? finding.type,
      count: 0,
      amount: 0,
      share: 0,
      severities: { high: 0, medium: 0, low: 0 },
    }
    current.count += 1
    current.amount += finding.amount
    current.severities[finding.severity] += 1
    byType.set(finding.type, current)
  }

  return Array.from(byType.values())
    .map((group) => ({
      ...group,
      share: total > 0 ? Math.round((group.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
}

function buildPriority(
  findings: Finding[],
  recoverable: number
): { priority: AnalysisInsights['priority']; reason: string } {
  const high = findings.filter((f) => f.severity === 'high').length
  const medium = findings.filter((f) => f.severity === 'medium').length

  if (findings.length === 0) {
    return {
      priority: 'ninguna',
      reason: 'No se encontraron cobros que cumplan los criterios de reclamo.',
    }
  }
  if (high > 0 || recoverable >= 100_000) {
    return {
      priority: 'alta',
      reason:
        high > 0
          ? `${high} hallazgo${high === 1 ? '' : 's'} de prioridad alta respaldado${high === 1 ? '' : 's'} por evidencia.`
          : 'El monto recuperable supera $100.000 CLP.',
    }
  }
  if (medium > 0 || recoverable >= 20_000) {
    return {
      priority: 'media',
      reason: 'Hay hallazgos con respaldo parcial o un monto relevante para reclamar.',
    }
  }
  return {
    priority: 'baja',
    reason: 'Los hallazgos son de bajo monto o evidencia limitada; conviene revisarlos antes de reclamar.',
  }
}

function buildConfidence(params: {
  findings: Finding[]
  totalTransactions: number
  bankDetected: boolean
  hasAiSummary: boolean
}) {
  const { findings, totalTransactions, bankDetected, hasAiSummary } = params

  // Cobertura: con más transacciones leídas, más sólida es la conclusión.
  const coverage =
    totalTransactions >= 300 ? 40 : totalTransactions >= 100 ? 34 : totalTransactions >= 30 ? 26 : totalTransactions >= 5 ? 16 : 6

  // Evidencia: proporción de hallazgos con referencias a transacciones.
  const withRefs = findings.filter((f) => f.transactionRefs.length > 0).length
  const evidence =
    findings.length > 0
      ? Math.round((withRefs / findings.length) * 35)
      : totalTransactions > 0
        ? 28
        : 0

  const context = bankDetected ? 15 : 5
  const ai = hasAiSummary ? 10 : 0

  const total = Math.min(100, coverage + evidence + context + ai)
  const label: AnalysisInsights['confidenceLabel'] = total >= 75 ? 'alta' : total >= 50 ? 'media' : 'baja'

  return { confidence: total, confidenceBreakdown: { coverage, evidence, context, ai }, confidenceLabel: label }
}

function buildActionPlan(findings: Finding[], bank: string | null): ActionStep[] {
  if (findings.length === 0) {
    return [
      {
        title: 'Guarda este informe',
        description: 'No hay cobros reclamables, pero el informe sirve como respaldo de revisión.',
        tone: 'success',
      },
      {
        title: 'Repite el análisis cada 3 meses',
        description: 'Las comisiones se acumulan: un análisis periódico detecta patrones a tiempo.',
        tone: 'neutral',
      },
    ]
  }

  const steps: ActionStep[] = [
    {
      title: 'Descarga el reporte con evidencia',
      description:
        'Incluye el detalle de cada cobro, fechas y montos para que el banco no pueda desconocer el reclamo.',
      tone: 'neutral',
    },
    {
      title: `Presenta el reclamo en ${bank ?? 'tu banco'}`,
      description:
        'Hazlo por escrito en sucursal, web o ejecutivo de cuenta. Pide número de caso y guárdalo.',
      tone: 'warning',
    },
  ]

  if (findings.some((f) => f.type === 'duplicate_commission')) {
    steps.push({
      title: 'Cita la comisión de apertura original',
      description:
        'La comisión de crédito se cobra una vez. Adjunta el comprobante de la venta para exigir el reverso de las cuotas repetidas.',
      tone: 'neutral',
    })
  }

  if (findings.some((f) => f.type === 'installment_error')) {
    steps.push({
      title: 'Adjunta el comprobante de cuotas sin interés',
      description:
        'Muestra la condición "sin interés" pactada. El banco debe recalcular las cuotas cobradas con interés.',
      tone: 'neutral',
    })
  }

  steps.push({
    title: 'Escala a la CMF si no responden en 10 días hábiles',
    description:
      'La Comisión para el Mercado Financiero recibe reclamos en cmfchile.cl. Adjunta el número de caso del banco.',
    tone: 'warning',
  })

  return steps
}

export function buildAnalysisInsights(input: {
  anomalies: unknown
  totalTransactions?: number | null
  recoverableAmount?: number | null
  bank?: string | null
  hasAiSummary?: boolean
}): AnalysisInsights {
  const findings = normalizeFindings(input.anomalies)
  const findingsTotal = findings.reduce((sum, finding) => sum + finding.amount, 0)
  const stored = Math.abs(input.recoverableAmount ?? 0)
  const recoverable = stored > 0 ? stored : findingsTotal
  const totalTransactions = input.totalTransactions ?? 0

  const counts = {
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    total: findings.length,
  }

  const largest = findings.reduce<Finding | null>(
    (max, finding) => (!max || finding.amount > max.amount ? finding : max),
    null
  )

  const { priority, reason } = buildPriority(findings, recoverable)
  const confidence = buildConfidence({
    findings,
    totalTransactions,
    bankDetected: Boolean(input.bank),
    hasAiSummary: Boolean(input.hasAiSummary),
  })

  return {
    findings,
    groups: buildFindingGroups(findings),
    recoverable,
    findingsTotal,
    hasDiscrepancy: stored > 0 && findingsTotal > 0 && Math.abs(stored - findingsTotal) > 1,
    counts,
    largest,
    average: findings.length > 0 ? Math.round(recoverable / findings.length) : 0,
    priority,
    priorityReason: reason,
    ...confidence,
    actionPlan: buildActionPlan(findings, input.bank ?? null),
  }
}

/** Etiqueta de severidad reutilizable en la UI. */
export function severityLabel(severity: Severity): string {
  return SEVERITY[severity]?.label ?? severity
}
