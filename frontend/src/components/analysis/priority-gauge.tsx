import { cn } from '@/lib/utils'

interface PriorityGaugeProps {
  /** Confianza del análisis, 0–100. */
  confidence: number
  confidenceLabel: 'alta' | 'media' | 'baja'
  priority: 'alta' | 'media' | 'baja' | 'ninguna'
  size?: number
  className?: string
}

const PRIORITY_STYLES = {
  alta: { ring: 'stroke-danger-500', text: 'text-danger-600 dark:text-danger-500', label: 'Prioridad alta' },
  media: { ring: 'stroke-warning-500', text: 'text-warning-600 dark:text-warning-500', label: 'Prioridad media' },
  baja: { ring: 'stroke-brand-500', text: 'text-brand-600 dark:text-brand-300', label: 'Prioridad baja' },
  ninguna: { ring: 'stroke-success-500', text: 'text-success-600 dark:text-success-500', label: 'Sin hallazgos' },
} as const

const CONFIDENCE_LABEL: Record<PriorityGaugeProps['confidenceLabel'], string> = {
  alta: 'Confianza alta',
  media: 'Confianza media',
  baja: 'Confianza baja',
}

/**
 * Medidor circular de prioridad + confianza. Server component: no necesita JS.
 * El número grande es la confianza del análisis; el color y la etiqueta indican
 * la prioridad de reclamo.
 */
export function PriorityGauge({
  confidence,
  confidenceLabel,
  priority,
  size = 132,
  className,
}: PriorityGaugeProps) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, confidence)) / 100) * circumference
  const styles = PRIORITY_STYLES[priority]

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${styles.label}. Confianza del análisis: ${confidence} por ciento (${confidenceLabel}).`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-[stroke-dashoffset] duration-700 ease-out', styles.ring)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-display text-3xl font-semibold tabular-nums', styles.text)}>
            {confidence}
            <span className="ml-0.5 text-sm font-medium">%</span>
          </span>
          <span className="mt-0.5 text-2xs font-medium text-muted-foreground">{CONFIDENCE_LABEL[confidenceLabel]}</span>
        </div>
      </div>

      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', styles.text)}>{styles.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {confidence >= 75
            ? 'El resultado está respaldado por transacciones verificables.'
            : confidence >= 50
              ? 'Hay evidencia suficiente, pero conviene revisar el detalle.'
              : 'La evidencia es limitada: revisa las transacciones antes de reclamar.'}
        </p>
      </div>
    </div>
  )
}
