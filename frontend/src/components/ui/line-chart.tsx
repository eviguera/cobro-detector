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

export function LineChart({
  data,
  height = 120,
  color = "var(--primary)",
  showPoints = true,
  className,
}: LineChartProps) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end justify-between h-full">
        {/* Y-axis labels */}
        <div className="flex items-end justify-between h-full w-4 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
          {[maxValue, maxValue / 2, 0].map((val, i) => (
            <div key={i} className="text-right">
              {val === 0 ? "$0" : formatCurrency(val)}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 h-full relative">
          <svg
            width="100%"
            height={height}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={color} stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path
              d={generateAreaPath(data, maxValue)}
              fill="url(#area-gradient)"
              fillOpacity={0.1}
            />

            {/* Line */}
            <path
              d={generateLinePath(data, maxValue)}
              fill="none"
              stroke="url(#line-gradient)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {showPoints && (
              <g>
                {data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100
                  const y = 100 - (point.value / maxValue) * 80
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r={3}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                })}
              </g>
            )}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
          {data.map((d, i) => (
            <span
              key={i}
              className={cn(
                i === 0 ? "text-left" : i === data.length - 1 ? "text-right" : "text-center"
              )}
            >
              {d.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function generateLinePath(
  data: Array<{ name: string; value: number }>,
  maxValue: number
): string {
  if (data.length === 0) return ""

  let path = ""
  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - (point.value / maxValue) * 80
    if (index === 0) {
      path = `M ${x} ${y}`
    } else {
      const prevX = ((index - 1) / (data.length - 1)) * 100
      const prevY = 100 - (data[index - 1].value / maxValue) * 80
      const cp1x = prevX + (x - prevX) / 3
      const cp1y = prevY
      const cp2x = x - (x - prevX) / 3
      const cp2y = y
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`
    }
  })
  return path
}

function generateAreaPath(
  data: Array<{ name: string; value: number }>,
  maxValue: number
): string {
  if (data.length === 0) return ""

  let path = ""
  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - (point.value / maxValue) * 80
    if (index === 0) {
      path = `M ${x} ${100} L ${x} ${y}`
    } else {
      const prevX = ((index - 1) / (data.length - 1)) * 100
      const prevY = 100 - (data[index - 1].value / maxValue) * 80
      const cp1x = prevX + (x - prevX) / 3
      const cp1y = prevY
      const cp2x = x - (x - prevX) / 3
      const cp2y = y
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`
    }
  })
  path += ` L ${data[data.length - 1] ? ((data.length - 1) / (data.length - 1)) * 100 : 0} ${100} Z`
  return path
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value)
}
