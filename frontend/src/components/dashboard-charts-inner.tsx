'use client'

import {
  Area,
  AreaChart,
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

const numberFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="num mt-0.5 text-primary">{formatCLP(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="num mt-0.5 text-foreground">
        {value} {value === 1 ? 'análisis' : 'análisis'}
      </p>
    </div>
  )
}

export interface RecoveryChartProps {
  data: { month: string; amount: number }[]
}

export function RecoveryChartInner({ data }: RecoveryChartProps) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="recoveryFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value: number) => `$${numberFormatter.format(Math.round(value / 1000))}K`}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#recoveryFill)"
            dot={{ r: 2.5, fill: 'hsl(var(--card))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface ActivityChartProps {
  data: { day: string; count: number; isToday: boolean }[]
}

export function ActivityChartInner({ data }: ActivityChartProps) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={24}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Tooltip content={<CountTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
          <Bar dataKey="count" isAnimationActive={false} radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((entry) => (
              <Cell
                key={entry.day}
                fill={entry.count === 0 ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'}
                opacity={entry.isToday ? 1 : entry.count === 0 ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
