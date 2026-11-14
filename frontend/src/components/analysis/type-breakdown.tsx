'use client'

import dynamic from 'next/dynamic'
import type { TypeBreakdownProps } from './type-breakdown-inner'

/** recharts se carga de forma diferida (solo en el cliente). */
const TypeBreakdownDynamic = dynamic(
  () => import('./type-breakdown-inner').then((mod) => mod.TypeBreakdownInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
        role="status"
        aria-label="Cargando composición del monto"
      >
        <div className="mb-5 space-y-2">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="h-3 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="min-h-[210px] w-full flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 h-3 w-full animate-pulse rounded bg-muted" />
      </div>
    ),
  }
)

export type { TypeBreakdownProps }

export function TypeBreakdown({ groups }: TypeBreakdownProps) {
  if (groups.length === 0) return null
  return <TypeBreakdownDynamic groups={groups} />
}
