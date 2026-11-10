'use client'

import { useState } from 'react'
import { Loader2, ShoppingCart, ArrowRight, Percent } from 'lucide-react'
import type { Plan } from '@/domain'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createPaymentPreference } from '@/infrastructure/http/payment-api'
import { formatPrice, isPercentagePlan } from '@/lib/plans'
import { cn } from '@/lib/cn'

interface BuyButtonProps {
  plan: Plan
  variant?: 'highlighted' | 'default' | 'platino'
}

export function BuyButton({ plan, variant = 'default' }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)
  const percentage = isPercentagePlan(plan)

  const handleBuy = async () => {
    if (percentage) {
      window.location.href = '/analisis?plan=platino'
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !user.email) {
        toast.error('Debes iniciar sesión para comprar')
        return
      }

      const pref = await createPaymentPreference({
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.full_name ?? null,
        planKey: plan.key,
        appUrl: window.location.origin,
      })

      const payUrl = pref.init_point ?? ''
      if (!payUrl) {
        toast.error('No se pudo obtener el link de pago')
        return
      }

      window.location.href = payUrl
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Paleta unificada: azul para compra directa, esmeralda para el plan a éxito.
  const classes =
    variant === 'platino'
      ? 'bg-success-600 text-white hover:bg-success-700 shadow-sm'
      : variant === 'highlighted'
        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
        : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40'

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-60',
        classes
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando pago...
        </>
      ) : percentage ? (
        <>
          <Percent className="h-4 w-4" />
          Empezar sin costo fijo
          <ArrowRight className="h-4 w-4" />
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          Comprar {plan.name} · {formatPrice(plan.price)}
        </>
      )}
    </button>
  )
}
