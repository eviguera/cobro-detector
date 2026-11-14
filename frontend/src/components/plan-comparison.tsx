import type { ReactNode } from 'react'
import { CheckCircle2, Percent } from 'lucide-react'
import type { Plan } from '@/types/database.types'
import {
  PLANS,
  getPlanBadge,
  getPlanPriceDescription,
  getPlanPriceLabel,
} from '@/lib/plans'
import { cn } from '@/lib/cn'

interface PlanComparisonProps {
  /** CTA de cada plan, provisto por la página (Link de registro o botón de compra). */
  renderAction: (plan: Plan) => ReactNode
  className?: string
}

/**
 * Comparación compacta de planes para pantallas angostas.
 *
 * Una fila por plan (nombre, precio, condiciones y beneficios) en vez de una
 * matriz de columnas que obliga a hacer scroll horizontal. Los precios y textos
 * salen siempre de `@/lib/plans`, así que no hay montos duplicados en el markup.
 */
export function PlanComparison({ renderAction, className }: PlanComparisonProps) {
  return (
    <div
      className={cn(
        'divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card',
        className
      )}
    >
      {PLANS.map((plan) => {
        const badge = getPlanBadge(plan)

        return (
          <section key={plan.key} aria-labelledby={`plan-comparison-${plan.key}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3
                    id={`plan-comparison-${plan.key}`}
                    className="text-sm font-semibold text-foreground"
                  >
                    {plan.name}
                  </h3>
                  {plan.highlighted ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-2xs font-semibold text-primary-foreground">
                      Más popular
                    </span>
                  ) : null}
                  {badge ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success-200 bg-success-50 px-1.5 py-0.5 text-2xs font-semibold text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-500">
                      <Percent className="h-2.5 w-2.5" aria-hidden="true" />
                      Éxito
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {getPlanPriceDescription(plan)}
                </p>
              </div>
              <p className="num shrink-0 text-right font-display text-xl font-semibold tracking-tight text-foreground">
                {getPlanPriceLabel(plan)}
              </p>
            </div>

            <ul className="mt-3 space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                  <CheckCircle2
                    className="mt-0.5 h-3 w-3 shrink-0 text-success-600 dark:text-success-500"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3">{renderAction(plan)}</div>
          </section>
        )
      })}

      <p className="bg-surface-muted/50 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Todos los planes incluyen análisis completos y reporte descargable. Los créditos no vencen.
      </p>
    </div>
  )
}
