import { CheckCircle2, ClipboardCheck, Info, Scale, ShieldAlert } from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import { ANOMALY_TYPES } from '@/lib/constants'
import type { AnomalyEvidence, DetectedAnomaly } from '@/domain'

const SEVERITY_META = {
  high: {
    label: 'Alta prioridad',
    chip: 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
    rule: 'bg-danger-500',
    border: 'border-danger-200 dark:border-danger-500/25',
    tint: 'bg-danger-50/40 dark:bg-danger-500/5',
  },
  medium: {
    label: 'Media',
    chip: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    rule: 'bg-warning-500',
    border: 'border-warning-200 dark:border-warning-500/25',
    tint: 'bg-warning-50/40 dark:bg-warning-500/5',
  },
  low: {
    label: 'Baja',
    chip: 'bg-secondary text-muted-foreground',
    rule: 'bg-muted-foreground',
    border: 'border-border',
    tint: 'bg-secondary/30',
  },
} as const

export function getClaimInstructions(type: string): string {
  switch (type) {
    case 'duplicate_commission':
      return 'Presenta este reporte en sucursal o a tu ejecutivo. Solicita el reverso de las comisiones duplicadas citando fecha y monto. El banco tiene 10 días hábiles para responder.'
    case 'installment_error':
      return 'Pide el recálculo de las cuotas. Adjunta el comprobante original de la venta en cuotas sin interés y marca las cuotas cobradas de más.'
    case 'unknown_charge':
      return 'Solicita por escrito el detalle del cargo. Si no pueden justificarlo, exige el reverso inmediato. Si no responden en 10 días, escala a la CMF.'
    case 'incorrect_charge':
      return 'Compara el cargo con tus registros. Si no corresponde, presenta este reporte solicitando el reverso del monto.'
    default:
      return 'Presenta este reporte en el banco para solicitar el reverso del cargo detectado.'
  }
}

function confidenceLabel(confidence?: number): { label: string; tone: string } | null {
  if (typeof confidence !== 'number') return null
  if (confidence >= 85) return { label: `${confidence}% confianza`, tone: 'text-success-700 dark:text-success-500' }
  if (confidence >= 65) return { label: `${confidence}% confianza`, tone: 'text-warning-700 dark:text-warning-500' }
  return { label: `${confidence}% confianza`, tone: 'text-muted-foreground' }
}

function EvidenceBlock({ evidence }: { evidence: AnomalyEvidence }) {
  const rows: Array<{ label: string; value: string }> = []
  if (evidence.period) rows.push({ label: 'Período', value: evidence.period })
  if (evidence.merchant) rows.push({ label: 'Comercio', value: evidence.merchant })
  if (evidence.count) rows.push({ label: 'Cobros', value: String(evidence.count) })
  if (evidence.dates?.length) rows.push({ label: 'Fechas', value: evidence.dates.join(' · ') })
  if (evidence.amounts?.length) {
    rows.push({
      label: 'Montos',
      value: evidence.amounts.map((amount) => formatCLP(Math.abs(amount))).join(' · '),
    })
  }

  if (rows.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="eyebrow">Evidencia</p>
      </div>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
            <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
            <dd className="num text-right font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

interface AnomalyCardProps extends DetectedAnomaly {
  variant?: 'compact' | 'full'
  index?: number
}

/**
 * Hallazgo con evidencia, confianza y acción recomendada. Cuando el backend no
 * envía los campos extendidos, cae en el detalle legado sin romper.
 */
export function AnomalyCard({
  type,
  severity,
  title,
  description,
  detail,
  recoverableAmount,
  confidence,
  evidence,
  recommendedAction,
  variant = 'compact',
}: AnomalyCardProps) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.low
  const confidenceMeta = confidenceLabel(confidence)
  const typeLabel = ANOMALY_TYPES[type] ?? type

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-card ${meta.border} ${meta.tint}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${meta.rule}`} aria-hidden="true" />

      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              {meta.label}
            </span>
            <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {typeLabel}
            </span>
            {confidenceMeta ? (
              <span className={`text-[10px] font-semibold ${confidenceMeta.tone}`}>{confidenceMeta.label}</span>
            ) : null}
          </div>
          <p className="num-display shrink-0 text-xl font-semibold tracking-tight text-foreground">
            {formatCLP(Math.abs(recoverableAmount))}
          </p>
        </div>

        <h3 className="mt-3 font-display text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>

        {evidence ? <EvidenceBlock evidence={evidence} /> : detail ? (
          <p className="num mt-3 rounded-lg bg-background/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {detail}
          </p>
        ) : null}

        {variant === 'full' ? (
          <div className="mt-4 border-t border-border/70 pt-4">
            <div className="flex items-start gap-2">
              <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Cómo reclamar
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-foreground">
                  {recommendedAction ?? getClaimInstructions(type)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Scale className="h-3 w-3" aria-hidden="true" />
                Ley 21.398 · derechos del consumidor
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-success-600 dark:text-success-500" aria-hidden="true" />
                Evidencia incluida en el reporte
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
