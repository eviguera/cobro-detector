import { PLANS } from '@/lib/plans'
import { formatCLP } from '@/lib/utils'
import { CheckCircle2, Zap, Percent, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Credits } from '@/types/database.types'
import { BuyButton } from './buy-button'

export default async function PreciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creditsData } = await supabase.from('credits').select('*').eq('user_id', user.id).single()
  const credits = creditsData as Credits | null
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="animate-fade-in-up">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4c6ef5] animate-pulse-subtle" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4c6ef5]">Planes</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-100 mb-2">Planes simples y transparentes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Elegí el plan que mejor se adapte a tu negocio.
          {creditsLeft > 0 && <> Tenés <strong className="text-[#4c6ef5]">{creditsLeft} crédito{creditsLeft !== 1 ? 's' : ''}</strong> disponibles.</>}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
        {PLANS.map(plan => {
          const isPlatino = !!plan.percentage
          const isHighlighted = plan.highlighted

          return (
            <div key={plan.key} className={`relative rounded-xl p-6 flex flex-col ${
              isHighlighted
                ? 'bg-[#4c6ef5] text-white scale-[1.02]'
                : 'bg-white dark:bg-gray-900'
            }`} style={{ filter: isHighlighted ? 'drop-shadow(0px 8px 16px rgba(76,110,245,0.3))' : 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
              {isHighlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#10b981] text-white rounded-full text-xs font-bold shadow-lg shadow-[#10b981]/30">
                  <Zap className="w-3 h-3" /> Más popular
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <p className={`font-display font-bold text-xl ${isHighlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{plan.name}</p>
                  {isPlatino && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${isHighlighted ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                      <Percent className="w-3 h-3" />{plan.percentage}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`font-display font-bold text-4xl ${isHighlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                    {isPlatino ? `${plan.percentage}%` : formatCLP(plan.price)}
                  </span>
                </div>
                <p className={`text-xs ${isHighlighted ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                  {isPlatino ? 'De lo recuperado · Sin costo fijo' : plan.key === 'contador' ? '10 créditos · o 20% de lo recuperado' : `${plan.credits} crédito${plan.credits !== 1 ? 's' : ''} · ${formatCLP(plan.pricePerAnalysis)} c/u`}
                </p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isHighlighted ? 'text-[#10b981]' : 'text-[#10b981]'}`} />
                    <span className={`text-sm ${isHighlighted ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.key === 'contador' ? (
                <div className="space-y-2">
                  <BuyButton plan={plan} variant="platino" />
                  <BuyButton plan={plan} />
                </div>
              ) : (
                <BuyButton plan={plan} variant={plan.percentage ? 'platino' : plan.highlighted ? 'highlighted' : 'default'} />
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-10 max-w-4xl">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.04))' }}>
          <h3 className="font-display font-bold text-gray-900 dark:text-gray-100 mb-4">Preguntas frecuentes</h3>
          <div className="space-y-3">
            {[
              { q: '¿Los créditos vencen?', a: 'No. Los créditos que compres son tuyos para siempre. Los podés usar cuando quieras.' },
              { q: '¿Qué incluye un análisis?', a: 'Detección de comisiones duplicadas, errores en cuotas, cargos no reconocidos, resumen con IA y reporte detallado.' },
              { q: '¿Cómo funciona el plan Platino?', a: 'Sin costo fijo. Solo pagás el 20% de lo que lográs recuperar.' },
              { q: '¿Cómo pago?', a: 'Aceptamos tarjetas de débito y crédito a través de Mercado Pago.' },
            ].map(item => (
              <details key={item.q} className="group rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                <summary className="flex items-center justify-between cursor-pointer p-4 list-none">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.q}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-90" />
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-500 dark:text-gray-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
