'use client'

import dynamic from 'next/dynamic'
import type { RecoveryTrendProps, TrendPoint } from './recovery-trend-inner'

/** recharts se carga de forma diferida (solo en el cliente). */
const RecoveryTrendDynamic = dynamic(
  () => import('./recovery-trend-inner').then((mod) => mod.RecoveryTrendInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
        role="status"
        aria-label="Cargando evolución del monto recuperable"
      >
        <div className="mb-5 space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    ),
  }
)

export type { RecoveryTrendProps, TrendPoint }

export function RecoveryTrend({ data, total }: RecoveryTrendProps) {
  if (data.length === 0) return null
  return <RecoveryTrendDynamic data={data} total={total} />
}
