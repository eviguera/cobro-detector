'use client'

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-500">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Algo salió mal</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentar de nuevo o volver al panel.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Intentar de nuevo
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al panel
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 font-mono text-2xs text-muted-foreground">ID del error: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
