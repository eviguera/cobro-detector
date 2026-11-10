import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Zap, Percent, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Credits } from '@/types/database.types'
import {
  PLANS,
  getPlanBadge,
  getPlanPriceDescription,
  getPlanPriceLabel,
  isPercentagePlan,
} from '@/lib/plans'
import { cn } from '@/lib/cn'
import { BuyButton } from './buy-button'
import { PlatinoCalculator } from './platino-calculator'
import { Card } from '@/components/ui/card'

const FAQ = [
  {
    q: '¿Los créditos vencen?',
    a: 'No. Los créditos que compras son permanentes.',
  },
  {
    q: '¿Qué incluye un análisis?',
    a: 'Detección de comisiones duplicadas, errores en cuotas, cargos no reconocidos, resumen con IA y reporte detallado.',
  },
  {
    q: '¿Cómo funciona el plan Platino?',
    a: 'Sin costo fijo. Solo pagas el 20% de lo que logres recuperar.',
  },
  {
    q: '¿Cómo pago?',
    a: 'Aceptamos tarjetas de débito y crédito a través de Mercado Pago.',
  },
]

export const metadata: Metadata = { title: 'Planes y créditos' }

export default async function PreciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creditsData } = await supabase.from('credits').select('*').eq('user_id', user.id).single()
  const credits = creditsData as Credits | null
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div className="mb-10 max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            Planes de análisis
          </span>
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Elige tu plan
        </h1>
        <p className="text-sm text-muted-foreground">
          Elige cuántas cartolas quieres auditar. Los créditos no vencen.
          {creditsLeft > 0 && (
            <span className="ml-2 font-medium text-foreground">
              Tienes{' '}
              <strong>
                {creditsLeft} crédito{creditsLeft !== 1 ? 's' : ''}
              </strong>{' '}
              disponibles.
            </span>
          )}
        </p>
      </div>

      {/* Tarjetas */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const percentage = isPercentagePlan(plan)
          const badge = getPlanBadge(plan)
          const variant = percentage ? 'platino' : plan.highlighted ? 'highlighted' : 'default'

          return (
            <Card
              key={plan.key}
              className={cn(
                'relative flex flex-col',
                plan.highlighted
                  ? 'border-primary shadow-md ring-1 ring-primary/20'
                  : 'border-border'
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <div className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
                    <Zap className="h-3 w-3" />
                    Más popular
                  </div>
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                {/* Nombre + badge */}
                <div className="mb-5">
                  <div className="mb-3 flex min-w-0 items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {plan.name}
                    </p>
                    {badge && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700 dark:border-success-500/25 dark:bg-success-500/10 dark:text-success-500">
                        <Percent className="h-3 w-3" />
                        Éxito {badge}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={cn(
                        'font-display font-bold tracking-tight tabular-nums text-foreground',
                        percentage ? 'text-2xl xl:text-3xl' : 'text-3xl xl:text-4xl'
                      )}
                      title={getPlanPriceLabel(plan)}
                    >
                      {getPlanPriceLabel(plan)}
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {getPlanPriceDescription(plan)}
                  </p>
                </div>

                {/* Beneficios */}
                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-500" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA anclado al fondo */}
                <div className="mt-6">
                  <BuyButton plan={plan} variant={variant} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Pago seguro con Mercado Pago. Los créditos no vencen.
      </p>

      <PlatinoCalculator />

      {/* FAQ */}
      <div className="mx-auto mt-12 max-w-4xl">
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Preguntas frecuentes
            </h2>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-sm font-medium text-foreground">{item.q}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ¿Necesitas asesoría para elegir?{' '}
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Vuelve a tu panel
        </Link>
      </p>
    </div>
  )
}
