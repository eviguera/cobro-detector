'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Search, X } from 'lucide-react'
import Link from 'next/link'
import { formatCLP, formatDate } from '@/lib/utils'
import type { Analysis } from '@/domain'
import { cn } from '@/lib/utils'

interface DashboardClientProps {
  analyses: Analysis[]
  emptyState: React.ReactNode
}

type StatusFilter = 'all' | 'completed' | 'processing' | 'error'

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Completados' },
  { value: 'processing', label: 'En proceso' },
  { value: 'error', label: 'Con error' },
]

export function DashboardClient({ analyses, emptyState }: DashboardClientProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return analyses.filter((analysis) => {
      const matchesQuery = !term || analysis.file_name.toLowerCase().includes(term)
      const matchesStatus =
        status === 'all' ||
        (status === 'processing'
          ? analysis.status === 'processing' || analysis.status === 'pending'
          : analysis.status === status)
      return matchesQuery && matchesStatus
    })
  }, [analyses, query, status])

  const hasFilters = query !== '' || status !== 'all'

  if (analyses.length === 0 && !hasFilters) {
    return <>{emptyState}</>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
        <label className="relative flex-1">
          <span className="sr-only">Buscar análisis por nombre de archivo</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre de archivo…"
            className="h-10 w-full rounded-xl border border-input bg-surface-muted pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              aria-pressed={status === filter.value}
              className={cn(
                'h-8 rounded-lg px-2.5 text-xs font-medium transition-colors',
                status === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-xs font-medium text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'análisis' : 'análisis'}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setStatus('all')
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Sin resultados</p>
          <p className="mt-1 text-xs text-muted-foreground">Prueba con otro nombre o cambia el filtro.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((analysis) => {
            const isCompleted = analysis.status === 'completed'
            const isProcessing = analysis.status === 'processing' || analysis.status === 'pending'
            const isError = analysis.status === 'error' || analysis.status === 'failed'
            const hasFindings = (analysis.anomalies_count ?? 0) > 0

            return (
              <li key={analysis.id}>
                <Link
                  href={`/historial/${analysis.id}`}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/60 sm:gap-4 sm:px-5"
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isCompleted
                        ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
                        : isProcessing
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                          : 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-500'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : isProcessing ? (
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        aria-hidden="true"
                      />
                    ) : (
                      <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300">
                        {analysis.file_name}
                      </span>
                      {hasFindings && !isError && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-danger-50 px-1.5 py-0.5 text-2xs font-semibold text-danger-700 dark:bg-danger-500/15 dark:text-danger-500">
                          <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                          {analysis.anomalies_count}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                      <span>{analysis.bank ?? 'Banco no detectado'}</span>
                      <span aria-hidden="true">·</span>
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <span>{formatDate(analysis.created_at)}</span>
                    </span>
                  </span>

                    <span className="hidden shrink-0 items-center gap-6 sm:flex">
                    <span className="text-right">
                      <span className="block text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                        Anomalías
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 block text-sm font-semibold tabular-nums',
                          isError
                            ? 'text-muted-foreground'
                            : hasFindings
                              ? 'text-danger-600 dark:text-danger-500'
                              : 'text-success-600 dark:text-success-500'
                        )}
                      >
                        {isError ? '—' : analysis.anomalies_count ?? 0}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                        Recuperable
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">
                        {isError ? '—' : formatCLP(analysis.recoverable_amount ?? 0)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-lg px-2.5 py-1 text-2xs font-semibold',
                        isCompleted
                          ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
                          : isProcessing
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                            : 'bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-500'
                      )}
                    >
                      {isCompleted ? 'Completado' : isProcessing ? 'Procesando' : 'Error'}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
