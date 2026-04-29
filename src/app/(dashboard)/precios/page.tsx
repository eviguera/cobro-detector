import { PLANS } from '@/lib/plans'
import { formatCLP } from '@/lib/utils'
import { CheckCircle2, Zap } from 'lucide-react'
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Comprar créditos</h1>
        <p className="text-sm text-gray-500">
          Cada crédito = 1 análisis completo de estado de cuenta.
          Tienes <strong>{creditsLeft} crédito{creditsLeft !== 1 ? 's' : ''}</strong> disponibles.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl">
        {PLANS.map(plan => (
          <div key={plan.key} className={`bg-white rounded-2xl border p-7 flex flex-col relative ${
            plan.highlighted ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
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
              <p className="text-sm font-medium text-gray-500 mb-3">{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">{formatCLP(plan.price)}</span>
              </div>
              <p className="text-xs text-gray-400">
                {plan.credits} créditos · {formatCLP(plan.pricePerAnalysis)} c/u
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>

            <BuyButton plan={plan} highlighted={plan.highlighted} />
          </div>
        ))}
      </div>

      <div className="mt-8 max-w-4xl">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Preguntas frecuentes</h3>
          <div className="space-y-4">
            {[
              {
                q: '¿Los créditos vencen?',
                a: 'No. Los créditos que compras son permanentes y puedes usarlos cuando quieras.',
              },
              {
                q: '¿Qué incluye un análisis?',
                a: 'Detección de comisiones duplicadas, errores en cuotas, cargos no reconocidos, resumen con IA y reporte PDF listo para el banco.',
              },
              {
                q: '¿Cómo pago?',
                a: 'Aceptamos tarjetas de débito y crédito a través de Mercado Pago. También puedes pagar por transferencia (contacta soporte).',
              },
              {
                q: '¿Garantía de devolución?',
                a: 'Si no detectamos ninguna anomalía en tu estado de cuenta, te devolvemos el crédito usado.',
              },
            ].map(item => (
              <div key={item.q}>
                <p className="text-sm font-medium text-gray-900">{item.q}</p>
                <p className="text-sm text-gray-500 mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
