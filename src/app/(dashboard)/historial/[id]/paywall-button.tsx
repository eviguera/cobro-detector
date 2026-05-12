'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  analysisId: string
  amount: number
}

export default function PaywallButton({ analysisId, amount }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/unlock-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al crear el pago')
        return
      }

      if (data.unlocked) {
        toast.success('Reporte desbloqueado')
        window.location.reload()
        return
      }

      const payUrl = data.sandboxInitPoint || data.initPoint
      if (payUrl) {
        window.location.href = payUrl
      } else {
        toast.error('No se pudo obtener el link de pago')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a MercadoPago...</>
      ) : (
        <>Pagar {formatCLP(amount)} con MercadoPago</>
      )}
    </button>
  )
}
