import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatCLP } from '@/lib/utils'
import type { Order } from '@/types/database.types'

interface Props {
  searchParams: { order?: string; pending?: string }
}

export default async function PagoExitosoPage({ searchParams }: Props) {
  const isPending = searchParams.pending === 'true'
  const orderId = searchParams.order

  let credits = 0
  let planName = ''
  let amount = 0

  if (orderId) {
    const supabase = await createClient()
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    const order = orderData as Order | null

    if (order) {
      credits = order.credits_purchased
      planName = order.plan
      amount = order.amount_clp
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
        {isPending ? (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Pago en proceso</h1>
            <p className="text-gray-500 mb-6">
              Tu pago está siendo procesado. Recibirás un email de confirmación cuando se acrediten los créditos (usualmente en minutos).
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">¡Pago exitoso!</h1>
            <p className="text-gray-500 mb-6">
              Tu compra fue procesada correctamente. Los créditos ya están disponibles en tu cuenta.
            </p>
          </>
        )}

        {credits > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 text-left">
            <p className="text-xs text-blue-500 font-medium mb-3 uppercase tracking-wide">Resumen de compra</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium capitalize">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Créditos</span>
                <span className="font-medium text-blue-700">+{credits} análisis</span>
              </div>
              {amount > 0 && (
                <div className="flex justify-between text-sm border-t border-blue-100 pt-2 mt-2">
                  <span className="text-gray-500">Total pagado</span>
                  <span className="font-semibold">{formatCLP(amount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/analisis"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Analizar estado de cuenta
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
