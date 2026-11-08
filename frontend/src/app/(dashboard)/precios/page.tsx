import { PLANS } from '@/lib/plans'
import { formatCLP } from '@/lib/utils'
import { CheckCircle2, Zap, Percent } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Credits } from '@/types/database.types'
import { BuyButton } from './buy-button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function PreciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creditsData } = await supabase.from('credits').select('*').eq('user_id', user.id).single()
  const credits = creditsData as Credits | null
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
            Planes de análisis
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-2">
          Elige tu plan
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
          Elegí el plan que mejor se adapte a tu negocio.
          {creditsLeft > 0 && (
            <span className="ml-2 font-medium text-gray-700 dark:text-gray-300">
              Tienes <strong>{creditsLeft} crédito{creditsLeft !== 1 ? 's' : ''}</strong> disponibles.
            </span>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {PLANS.map(plan => {
          const isPlatino = !!plan.percentage
          return (
            <Card key={plan.key} className={`flex flex-col relative ${plan.highlighted ? 'border-blue-500 ring-1 ring-blue-500 dark:border-blue-400 dark:ring-blue-400 shadow-lg shadow-blue-500/20 dark:shadow-blue-900/40' : 'border-border'}`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-semibold px-3 py-1 rounded-full shadow-lg shadow-blue-500/40">
                    <Zap className="w-3 h-3" />
                    Más popular
                  </div>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{plan.name}</p>
                  {isPlatino && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      <Percent className="w-3 h-3" />
                      {plan.percentage}%
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl sm:text-5xl font-display font-bold text-gray-900 dark:text-gray-100">
                    {isPlatino ? `${plan.percentage}%` : formatCLP(plan.price)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {isPlatino
                    ? 'De lo recuperado · Sin costo fijo'
                    : plan.key === 'contador'
                      ? '10 créditos · o 20% de lo recuperado'
                      : `${plan.credits} crédito${plan.credits !== 1 ? 's' : ''} · ${formatCLP(plan.pricePerAnalysis)} c/u`}
                </p>
              </CardHeader>

              <CardContent className="flex-1 pb-6">
                <ul className="space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isPlatino ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.key === 'contador' ? (
                  <div className="space-y-2 mt-4">
                    <BuyButton plan={plan} variant="platino" />
                    <BuyButton plan={plan} />
                  </div>
                ) : (
                  <BuyButton plan={plan} variant={plan.percentage ? 'platino' : plan.highlighted ? 'highlighted' : 'default'} />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-12 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Preguntas frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="space-y-4">
              {[
                { q: '¿Los créditos vencen?', a: 'No. Los créditos que compras son permanentes.' },
                { q: '¿Qué incluye un análisis?', a: 'Detección de comisiones duplicadas, errores en cuotas, cargos no reconocidos, resumen con IA y reporte detallado.' },
                { q: '¿Cómo funciona el plan Platino?', a: 'Sin costo fijo. Solo pagás el 20% de lo que lográs recuperar.' },
                { q: '¿Cómo pago?', a: 'Aceptamos tarjetas de débito y crédito a través de Mercado Pago.' },
              ].map(item => (
                <div key={item.q} className="border-b border-border pb-4 last:border-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.q}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
