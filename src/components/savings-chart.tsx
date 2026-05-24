'use client'

import { TrendingUp } from 'lucide-react'
import { formatCLP } from '@/lib/utils'

interface SavingsChartProps {
  data: { month: string; amount: number }[]
  total: number
}

export function SavingsChart({ data, total }: SavingsChartProps) {
  if (data.length === 0) return null

  const maxAmount = Math.max(...data.map(d => d.amount), 1)

  return (
    <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold tracking-wider uppercase">Ahorro estimado</p>
          <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCLP(total)}
          </p>
        </div>
        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      <div className="flex items-end gap-2 h-32">
        {data.map((item, i) => {
          const height = (item.amount / maxAmount) * 100
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tabular-nums">
                {formatCLP(item.amount).replace('$', '')}
              </span>
              <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-t-lg transition-all duration-700 ease-out animate-fade-in-up relative overflow-hidden min-h-[4px]" style={{ height: `${Math.max(height, 4)}%` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-400 opacity-80 rounded-t-lg" />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">{item.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
