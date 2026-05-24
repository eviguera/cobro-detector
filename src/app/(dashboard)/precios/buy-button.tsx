'use client'

import { useState } from 'react'
import { Loader2, ShoppingCart, ArrowRight } from 'lucide-react'
import type { Plan } from '@/types/database.types'
import { toast } from 'sonner'

type ButtonVariant = 'default' | 'highlighted' | 'platino'

const variantClasses: Record<ButtonVariant, string> = {
  platino: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
  highlighted: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  default: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/40',
}

const variantLabels: Record<ButtonVariant, (plan: Plan) => React.ReactNode> = {
  platino: () => <><ArrowRight className="w-4 h-4" /> Comenzar ahora</>,
  highlighted: (plan) => <><ShoppingCart className="w-4 h-4" /> Comprar {plan.name}</>,
  default: (plan) => <><ShoppingCart className="w-4 h-4" /> Comprar {plan.name}</>,
}

function createVariantComponent(variant: ButtonVariant) {
  return function BuyButtonVariant({ plan }: { plan: Plan }) {
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

    const classes = variantClasses[variant]
    const label = variantLabels[variant](plan)

    return (
      <button
        onClick={handleBuy}
        disabled={loading}
        className={`w-full py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${classes}`}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Preparando pago...</>
        ) : label}
      </button>
    )
  }
}

export const BuyButton = {
  Default: createVariantComponent('default'),
  Highlighted: createVariantComponent('highlighted'),
  Platino: createVariantComponent('platino'),
}
