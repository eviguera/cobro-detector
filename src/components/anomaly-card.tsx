import { formatCLP } from '@/lib/utils'
import { SEVERITY, ANOMALY_TYPES } from '@/lib/constants'

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Alta prioridad',
  medium: 'Media',
  low: 'Baja',
}

interface AnomalyCardBaseProps {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  detail?: string | null
  recoverableAmount: number
  index?: number
}

function getClaimInstructions(type: string): string {
  switch (type) {
    case 'duplicate_commission':
      return 'Presenta este reporte en sucursal o por ejecutivo de cuenta. Solicita reverso de comisiones duplicadas citando los montos y fechas. El banco tiene 10 días hábiles para responder.'
    case 'installment_error':
      return 'Solicita recalculo de cuotas. Muestra el comprobante original de la venta en cuotas sin interés y las cuotas cobradas incorrectamente.'
    case 'unknown_charge':
      return 'Solicita detalle del cargo por escrito. Si no pueden justificarlo, exige reverso inmediato. Puedes escalar a la CMF si el banco no responde en 10 días.'
    case 'incorrect_charge':
      return 'Revisa el detalle del cobro y compáralo con tus registros. Si no corresponde, presenta este reporte en el banco solicitando el reverso del cargo.'
    default:
      return 'Presenta este reporte en el banco para solicitar el reverso del cargo detectado.'
  }
}

function AnomalyCardBase({
  type,
  severity,
  title,
  description,
  detail,
  recoverableAmount,
  index = 0,
  children,
}: AnomalyCardBaseProps & { children?: React.ReactNode }) {
  const colorClasses = SEVERITY[severity]?.color ?? 'bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800/40'

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${colorClasses}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 dark:bg-gray-800/60">
            {ANOMALY_TYPES[type] ?? type}
          </span>
          <span className="text-xs opacity-70">{SEVERITY_LABELS[severity]}</span>
        </div>
        <span className="font-display font-bold text-lg tabular-nums">
          {formatCLP(recoverableAmount)}
        </span>
      </div>
      <p className="font-semibold text-sm mb-1">{title}</p>
      <p className="text-xs opacity-80 leading-relaxed">{description}</p>
      {detail && (
        <p className="text-xs opacity-60 mt-2 font-mono">{detail}</p>
      )}
      {children}
    </div>
  )
}

function Compact(props: AnomalyCardBaseProps) {
  return <AnomalyCardBase {...props} />
}

function Full(props: AnomalyCardBaseProps) {
  return (
    <AnomalyCardBase {...props}>
      <div className="mt-4 pt-4 border-t border-white/60">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">¿Cómo reclamar?</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {getClaimInstructions(props.type)}
        </p>
      </div>
    </AnomalyCardBase>
  )
}

export const AnomalyCard = {
  Compact,
  Full,
}
