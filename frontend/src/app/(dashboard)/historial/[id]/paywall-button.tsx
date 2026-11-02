'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createUnlockPayment } from '@/infrastructure/http/payment-api'

interface Props {
  analysisId: string
  /** Monto total recuperable del análisis. El backend calcula el 20%. */
  recoverableAmount: number
  fileName?: string
}

export default function PaywallButton({ analysisId, recoverableAmount, fileName }: Props) {
  const [loading, setLoading] = useState(false)
  const chargeAmount = Math.round(recoverableAmount * 0.2)

  const handlePay = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !user.email) {
        toast.error('Debes iniciar sesión')
        return
      }

      const result = await createUnlockPayment({
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.full_name ?? null,
        analysisId,
        analysisFileName: fileName ?? 'reporte',
        recoverableAmount,
        appUrl: window.location.origin,
      })

      if (result.init_point) {
        window.location.href = result.init_point
        return
      }

      // El backend responde { unlocked: true } cuando no hay monto a cobrar.
      if ('unlocked' in result && result.unlocked) {
        toast.success('Reporte desbloqueado')
        window.location.reload()
        return
      }

      toast.error('No se pudo obtener el link de pago')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading || chargeAmount <= 0}
      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a MercadoPago...</>
      ) : (
        <>Pagar {formatCLP(chargeAmount)} con MercadoPago</>
      )}
    </button>
  )
}
