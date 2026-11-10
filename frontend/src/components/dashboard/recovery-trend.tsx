'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCLP } from '@/lib/utils'

export interface TrendPoint {
  month: string
  amount: number
  analyses?: number
}

interface RecoveryTrendProps {
  data: TrendPoint[]
  total: number
}

function compact(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `$${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value}`
}

export function RecoveryTrend({ data, total }: RecoveryTrendProps) {
  if (data.length === 0) return null

  const summary = data.map((point) => `${point.month}: ${formatCLP(point.amount)}`).join(', ')

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Monto estimado a reclamar</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{formatCLP(total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Evolución de los últimos {data.length} {data.length === 1 ? 'mes' : 'meses'}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-2.5 py-1 text-2xs font-semibold text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-500">
          Recuperable
        </span>
      </div>

      <div className="h-48 w-full" role="img" aria-label={`Evolución del monto recuperable. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="recovery-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success-500))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="hsl(var(--success-500))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={compact}
              width={48}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--border))' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0].payload as TrendPoint
                return (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lift">
                    <p className="font-semibold text-foreground">{point.month}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {formatCLP(point.amount)}
                      {typeof point.analyses === 'number' ? ` · ${point.analyses} análisis` : ''}
                    </p>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(var(--success-500))"
              strokeWidth={2}
              fill="url(#recovery-fill)"
              dot={{ r: 3, fill: 'hsl(var(--card))', stroke: 'hsl(var(--success-500))', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Monto recuperable estimado por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Monto</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <td>{point.month}</td>
              <td>{formatCLP(point.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
