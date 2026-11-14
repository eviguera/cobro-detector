'use client'

import dynamic from 'next/dynamic'
import type { ActivityChartProps, RecoveryChartProps } from './dashboard-charts-inner'

/**
 * recharts se carga de forma diferida (solo en el cliente) para no enviar la
 * librería de gráficos en el bundle inicial del dashboard. El skeleton reserva
 * la misma altura que el gráfico real para evitar layout shift.
 */

const RecoveryChartDynamic = dynamic(
  () => import('./dashboard-charts-inner').then((mod) => mod.RecoveryChartInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[220px] w-full animate-pulse rounded-lg bg-muted"
        role="status"
        aria-label="Cargando gráfico de recuperación"
      />
    ),
  }
)

const ActivityChartDynamic = dynamic(
  () => import('./dashboard-charts-inner').then((mod) => mod.ActivityChartInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[180px] w-full animate-pulse rounded-lg bg-muted"
        role="status"
        aria-label="Cargando gráfico de actividad"
      />
    ),
  }
)

export type { ActivityChartProps, RecoveryChartProps }

export function RecoveryChart({ data }: RecoveryChartProps) {
  return <RecoveryChartDynamic data={data} />
}

export function ActivityChart({ data }: ActivityChartProps) {
  return <ActivityChartDynamic data={data} />
}
