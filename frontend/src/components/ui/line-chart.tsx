"use client"

import * as React from "react"

import { cn } from "@/lib/cn"

interface LineChartProps {
  data: Array<{ name: string; value: number }>
  height?: number
  color?: string
  showPoints?: boolean
  className?: string
}

const Y_TICKS = 4
const TOP_PADDING = 6 // % del alto reservado para que los puntos no se corten

export function LineChart({
  data,
  height = 160,
  color = "var(--primary, #2563eb)",
  showPoints = true,
  className,
}: LineChartProps) {
  const gradientId = React.useId().replace(/:/g, "")

  const points = React.useMemo(() => data ?? [], [data])
  if (points.length === 0) return null

  const rawMax = Math.max(...points.map((d) => d.value), 0)
  // Evita división por cero y deja aire arriba cuando todos los valores son iguales.
  const maxValue = rawMax > 0 ? rawMax * 1.08 : 1
  const minValue = 0
  const range = maxValue - minValue || 1

  const xAt = (index: number) =>
    points.length === 1 ? 50 : (index / (points.length - 1)) * 100
  const yAt = (value: number) =>
    TOP_PADDING + (1 - (value - minValue) / range) * (100 - TOP_PADDING)

  const linePath = points
    .map((point, index) => {
      const cmd = index === 0 ? "M" : "L"
      return `${cmd} ${xAt(index).toFixed(2)} ${yAt(point.value).toFixed(2)}`
    })
    .join(" ")

  const areaPath =
    points.length === 1
      ? `M 0 100 L ${xAt(0).toFixed(2)} ${yAt(points[0].value).toFixed(2)} L 100 100 Z`
      : `${linePath} L 100 100 L 0 100 Z`

  const ticks = Array.from({ length: Y_TICKS }, (_, i) => {
    const ratio = i / (Y_TICKS - 1)
    return maxValue * (1 - ratio)
  })

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2">
        {/* Etiquetas del eje Y */}
        <div
          className="flex w-14 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[10px] leading-none text-muted-foreground"
          style={{ height }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span key={tick}>{formatCurrency(tick)}</span>
          ))}
        </div>

        {/* Área del gráfico */}
        <div className="relative flex-1" style={{ height }}>
          {/* Gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((tick) => (
              <div key={tick} className="border-t border-gray-100 first:border-transparent dark:border-gray-800/60" />
            ))}
          </div>

          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={buildAriaLabel(points)}
          >
            <defs>
              <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill={`url(#${gradientId}-area)`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Puntos (divs: no se deforman con el viewBox estirado) */}
          {showPoints &&
            points.map((point, index) => (
              <span
                key={`${point.name}-${index}`}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--point-color)] shadow-sm dark:border-gray-900"
                style={
                  {
                    left: `${xAt(index)}%`,
                    top: `${yAt(point.value)}%`,
                    "--point-color": color,
                  } as React.CSSProperties
                }
                title={`${point.name}: ${formatCurrency(point.value)}`}
              />
            ))}
        </div>
      </div>

      {/* Etiquetas del eje X */}
      <div className="mt-2 flex gap-2">
        <div className="w-14 shrink-0" aria-hidden="true" />
        <div className="flex flex-1 justify-between gap-1 font-mono text-[10px] text-muted-foreground">
          {points.map((point, index) => (
            <span
              key={`${point.name}-${index}`}
              className={cn(
                "truncate",
                points.length === 1
                  ? "w-full text-center"
                  : index === 0
                    ? "text-left"
                    : index === points.length - 1
                      ? "text-right"
                      : "text-center"
              )}
            >
              {point.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildAriaLabel(data: Array<{ name: string; value: number }>): string {
  return data.map((d) => `${d.name}: ${formatCurrency(d.value)}`).join(", ")
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}
