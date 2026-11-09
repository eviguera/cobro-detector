import Link from 'next/link'
import { ArrowRight, FileSearch, Home, Shield } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Shield className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="font-mono text-6xl font-semibold tracking-tight text-muted-foreground/40">404</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Página no encontrada</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          El análisis que buscas no existe, fue eliminado o no tienes acceso a él.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ir al panel
          </Link>
          <Link
            href="/historial"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <FileSearch className="h-4 w-4" aria-hidden="true" />
            Ver historial
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
