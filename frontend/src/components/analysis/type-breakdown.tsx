'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCLP } from '@/lib/utils'
import type { FindingGroup } from '@/lib/analysis-insights'

interface TypeBreakdownProps {
  groups: FindingGroup[]
}

const COLORS = ['#ef4444', '#f59e0b', '#3b6df6', '#8b5cf6', '#10b981', '#0ea5e9']

function compact(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `$${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value}`
}

export function TypeBreakdown({ groups }: TypeBreakdownProps) {
  if (groups.length === 0) return null

  const data = groups.map((group) => ({
    name: group.label,
    amount: group.amount,
    count: group.count,
    share: group.share,
  }))

  const summary = groups
    .map((group) => `${group.label}: ${formatCLP(group.amount)} (${group.share}% del total)`)
    .join('. ')

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Composición del monto</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Qué tipo de cobro explica tu recuperación</p>
        </div>
      </div>

      <div className="min-h-[210px] w-full flex-1" role="img" aria-label={`Distribución del monto recuperable. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={compact}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload as { name: string; amount: number; count: number; share: number }
                return (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lift">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {formatCLP(item.amount)} · {item.count} hallazgo{item.count === 1 ? '' : 's'} · {item.share}%
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="amount" isAnimationActive={false} radius={[0, 6, 6, 0]} barSize={18}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-2xs text-muted-foreground">
        <span>
          {groups.length} categoría{groups.length === 1 ? '' : 's'} · {groups.reduce((sum, group) => sum + group.count, 0)} hallazgos
        </span>
        <span className="font-mono font-medium text-foreground">
          {formatCLP(groups.reduce((sum, group) => sum + group.amount, 0))}
        </span>
      </div>

      {/* Alternativa textual para lectores de pantalla */}
      <table className="sr-only">
        <caption>Distribución del monto recuperable por tipo de cobro</caption>
        <thead>
          <tr>
            <th scope="col">Tipo</th>
            <th scope="col">Hallazgos</th>
            <th scope="col">Monto</th>
            <th scope="col">Participación</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.type}>
              <td>{group.label}</td>
              <td>{group.count}</td>
              <td>{formatCLP(group.amount)}</td>
              <td>{group.share}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
