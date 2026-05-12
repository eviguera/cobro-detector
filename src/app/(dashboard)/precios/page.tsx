import { PLANS } from '@/lib/plans'
import { formatCLP } from '@/lib/utils'
import { CheckCircle2, Zap, Percent } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Credits } from '@/types/database.types'
import BuyButton from './buy-button'

export default async function PreciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: creditsData } = await supabase.from('credits').select('*').eq('user_id', user!.id).single()
  const credits = creditsData as Credits | null
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Planes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Elegí el plan que mejor se adapte a tu negocio.
          {creditsLeft > 0 && <> Tienes <strong>{creditsLeft} crédito{creditsLeft !== 1 ? 's' : ''}</strong> disponibles.</>}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 max-w-5xl">
        {PLANS.map(plan => {
          const isPlatino = !!plan.percentage
          return (
            <div key={plan.key} className={`bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border p-7 flex flex-col relative ${
              plan.highlighted ? 'border-blue-500 ring-1 ring-blue-500 dark:border-blue-400 dark:ring-blue-400' : 'border-gray-200 dark:border-gray-800/40'
            }`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    Más popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{plan.name}</p>
                  {isPlatino && (
                    <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      {plan.percentage}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    {isPlatino ? `${plan.percentage}%` : formatCLP(plan.price)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {isPlatino
                    ? 'De lo recuperado · Sin costo fijo'
                    : `${plan.credits} crédito${plan.credits !== 1 ? 's' : ''} · ${formatCLP(plan.pricePerAnalysis)} c/u`}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isPlatino ? 'text-amber-500' : 'text-green-500'}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>

              <BuyButton plan={plan} highlighted={plan.highlighted} />
            </div>
          )
        })}
      </div>

      <div className="mt-8 max-w-4xl">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800/40 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">Preguntas frecuentes</h3>
          <div className="space-y-4">
            {[
              {
                q: '¿Los créditos vencen?',
                a: 'No. Los créditos que compras son permanentes y puedes usarlos cuando quieras.',
              },
              {
                q: '¿Qué incluye un análisis?',
                a: 'Detección de comisiones duplicadas, errores en cuotas, cargos no reconocidos, resumen con IA y reporte detallado listo para el banco.',
              },
              {
                q: '¿Cómo funciona el plan Platino?',
                a: 'Sin costo fijo. Subís tu estado de cuenta, detectamos los cobros injustificados, y solo pagás el 20% de lo que lográs recuperar. El reporte se libera una vez acreditado el pago.',
              },
              {
                q: '¿Cómo pago?',
                a: 'Aceptamos tarjetas de débito y crédito a través de Mercado Pago.',
              },
            ].map(item => (
              <div key={item.q}>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.q}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
