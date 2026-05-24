'use client'

import { useState } from 'react'
import { Loader2, ShoppingCart, ArrowRight } from 'lucide-react'
import type { Plan } from '@/types/database.types'
import { toast } from 'sonner'

interface BuyButtonProps {
  plan: Plan
  variant?: 'highlighted' | 'default' | 'platino'
}

export function BuyButton({ plan, variant = 'default' }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleBuy = async () => {
    if (plan.percentage) {
      window.location.href = '/analisis?plan=platino'
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan.key }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al crear el pago')
        return
      }

      const payUrl = data.sandboxInitPoint || data.initPoint

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

  const isPlatino = variant === 'platino'
  const isHighlighted = variant === 'highlighted'

  const classes = isPlatino
    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
    : isHighlighted
      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/40'

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className={`w-full py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${classes}`}
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Preparando pago...</>
      ) : isPlatino ? (
        <><ArrowRight className="w-4 h-4" /> Comenzar ahora</>
      ) : (
        <><ShoppingCart className="w-4 h-4" /> Comprar {plan.name} — ${plan.price.toLocaleString('es-CL')}</>
      )}
    </button>
  )
}
