import { ArrowUpRight, CheckCircle2, Landmark, Scale } from 'lucide-react'
import type { ActionStep } from '@/lib/analysis-insights'
import { cn } from '@/lib/utils'

interface RecoveryPlanProps {
  steps: ActionStep[]
  bank: string | null
}

const TONE_ICON = {
  neutral: CheckCircle2,
  warning: Scale,
  success: CheckCircle2,
} as const

export function RecoveryPlan({ steps, bank }: RecoveryPlanProps) {
  return (
    <section aria-labelledby="plan-title" className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Landmark className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 id="plan-title" className="text-lg font-semibold tracking-tight">
            Plan para recuperar tu dinero
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sigue estos pasos en orden. El banco tiene 10 días hábiles para responder.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => {
          const Icon = TONE_ICON[step.tone]
          return (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  step.tone === 'warning'
                    ? 'border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-500'
                    : step.tone === 'success'
                      ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500'
                      : 'border-border bg-surface-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-border bg-surface-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          ¿El banco no responde? Escala el caso a la{' '}
          <strong className="text-foreground">Comisión para el Mercado Financiero (CMF)</strong>.
        </p>
        <a
          href="https://www.cmfchile.cl/portal/principal/613/w3-channel.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
        >
          Reclamar en la CMF
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      {bank && (
        <p className="mt-3 text-2xs text-muted-foreground">
          Banco detectado: <strong className="text-foreground">{bank}</strong>. Presenta el reclamo en una sucursal o
          por el canal de atención al cliente.
        </p>
      )}
    </section>
  )
}
