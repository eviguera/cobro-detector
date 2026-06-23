'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Algo salió mal
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Ocurrió un error inesperado. Por favor intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Intentar de nuevo
        </button>
        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
