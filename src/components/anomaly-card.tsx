import { formatCLP } from '@/lib/utils'

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400',
  medium: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400',
  low: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400',
}

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Alta prioridad',
  medium: 'Media',
  low: 'Baja',
}

const TYPE_LABELS: Record<string, string> = {
  duplicate_commission: 'Comisión duplicada',
  installment_error: 'Error en cuotas',
  unknown_charge: 'Cargo no reconocido',
  incorrect_charge: 'Cobro incorrecto',
}

interface AnomalyCardProps {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  detail?: string | null
  recoverableAmount: number
  mode?: 'compact' | 'full'
  index?: number
}

export function AnomalyCard({
  type,
  severity,
  title,
  description,
  detail,
  recoverableAmount,
  mode = 'compact',
  index = 0,
}: AnomalyCardProps) {
  const colorClasses = SEVERITY_COLORS[severity] ?? 'bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800/40'

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${colorClasses}`}
      style={mode === 'compact' ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 dark:bg-gray-800/60">
            {TYPE_LABELS[type] ?? type}
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

      {mode === 'full' && (
        <div className="mt-4 pt-4 border-t border-white/60">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">¿Cómo reclamar?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {type === 'duplicate_commission' &&
              'Presenta este reporte en sucursal o por ejecutivo de cuenta. Solicita reverso de comisiones duplicadas citando los montos y fechas. El banco tiene 10 días hábiles para responder.'}
            {type === 'installment_error' &&
              'Solicita recalculo de cuotas. Muestra el comprobante original de la venta en cuotas sin interés y las cuotas cobradas incorrectamente.'}
            {type === 'unknown_charge' &&
              'Solicita detalle del cargo por escrito. Si no pueden justificarlo, exige reverso inmediato. Puedes escalar a la CMF si el banco no responde en 10 días.'}
            {type === 'incorrect_charge' &&
              'Revisa el detalle del cobro y compáralo con tus registros. Si no corresponde, presenta este reporte en el banco solicitando el reverso del cargo.'}
          </p>
        </div>
      )}
    </div>
  )
}
