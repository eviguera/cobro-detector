'use client'

import { TrendingUp } from 'lucide-react'
import { formatCLP } from '@/lib/utils'

interface SavingsChartProps {
  data: { month: string; amount: number }[]
  total: number
}

const BAR_AREA_HEIGHT = 156

export function SavingsChart({ data, total }: SavingsChartProps) {
  if (data.length === 0) return null

  const maxAmount = Math.max(...data.map((d) => d.amount), 1)
  // Con un solo mes la barra no debe ocupar todo el ancho disponible.
  const barWidth = data.length === 1 ? 'w-16' : 'w-full max-w-[64px]'

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800/40 dark:bg-gray-900/60">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Monto estimado a reclamar
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCLP(total)}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      <div className="flex items-end gap-3" style={{ height: BAR_AREA_HEIGHT }}>
        {data.map((item, i) => {
          const pct = Math.max((item.amount / maxAmount) * 100, 2)

          return (
            <div
              key={item.month}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {formatCLP(item.amount).replace('$', '')}
              </span>

              {/* Contenedor con alto definido: el % de la barra ya tiene referencia */}
              <div className="flex min-h-0 w-full flex-1 items-end justify-center border-b border-gray-100 dark:border-gray-800/60">
                <div
                  className={`${barWidth} animate-fade-in-up rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-700 ease-out dark:from-emerald-600 dark:to-emerald-400`}
                  style={{ height: `${pct}%` }}
                  title={`${item.month}: ${formatCLP(item.amount)}`}
                />
              </div>

              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                {item.month}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
