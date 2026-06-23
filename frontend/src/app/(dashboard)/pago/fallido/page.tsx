import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: { order?: string }
}

export default function PagoFallidoPage({ searchParams: _searchParams }: Props) {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl border border-border p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-3">Pago no procesado</h1>
        <p className="text-muted-foreground mb-8">
          No se pudo completar el pago. No se realizó ningún cargo. Puedes intentarlo nuevamente con otro método de pago.
        </p>
        
        <div className="bg-muted/50 rounded-xl border border-border p-4 mb-8 text-left">
          <p className="text-xs font-medium text-muted-foreground mb-2">Causas comunes</p>
          <ul className="text-sm text-foreground space-y-1">
            <li>· Fondos insuficientes en la tarjeta</li>
            <li>· Datos de tarjeta incorrectos</li>
            <li>· Tarjeta bloqueada o vencida</li>
            <li>· Límite de transacciones excedido</li>
          </ul>
        </div>
        
        <div className="flex flex-col gap-3">
          <Link
            href="/precios"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Intentar nuevamente
          </Link>
          <Link href="/dashboard" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
        </div>
        
        <p className="text-xs text-muted-foreground mt-6">
          ¿Necesitas ayuda? Escríbenos a soporte@cobro-detector.cl
        </p>
      </div>
    </div>
  )
}
