"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/cn"

interface StatCardProps {
  title: string
  value: string | number
  subTitle?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    label: string
    type: "up" | "down" | "neutral"
  }
  trendFormat?: "percent" | "number"
  footer?: React.ReactNode
  accent?: "blue" | "emerald" | "amber" | "red" | "slate"
  className?: string
}

const accentClasses = {
  blue: "text-primary",
  emerald: "text-success-600 dark:text-success-500",
  amber: "text-warning-600 dark:text-warning-500",
  red: "text-danger-600 dark:text-danger-500",
  slate: "text-muted-foreground",
} as const

/**
 * Métrica compacta estilo ledger: etiqueta mono, cifra grande, contexto
 * debajo y tendencia alineada a la derecha. Sin barras de gradiente.
 */
export function StatCard({
  title,
  value,
  subTitle,
  icon,
  trend,
  trendFormat,
  footer,
  accent = "blue",
  className,
}: StatCardProps) {
  const trendColor =
    trend?.type === "up"
      ? "text-success-600 dark:text-success-500"
      : trend?.type === "down"
        ? "text-danger-600 dark:text-danger-500"
        : "text-muted-foreground"

  const TrendIcon =
    trend?.type === "up" ? ArrowUpRight : trend?.type === "down" ? ArrowDownRight : Minus

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5",
        "shadow-[0_1px_2px_rgba(17,19,21,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]",
        "transition-shadow duration-300 hover:shadow-md",
        "dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow pt-0.5">{title}</p>
        {icon ? (
          <span className={cn("shrink-0 opacity-80 transition-opacity group-hover:opacity-100", accentClasses[accent])}>
            {icon}
          </span>
        ) : null}
      </div>

      <p className="num-display mt-4 text-[2rem] font-semibold leading-none text-foreground">
        {value}
      </p>

      {(subTitle || trend) && (
        <div className="mt-3 flex items-end justify-between gap-3">
          {subTitle ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{subTitle}</p>
          ) : (
            <span />
          )}
          {trend ? (
            <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              <span className="num">
                {trend.value}
                {trendFormat === "percent" ? "%" : ""}
              </span>
              <span className="sr-only">{trend.label}</span>
            </span>
          ) : null}
        </div>
      )}

      {footer ? <div className="mt-4 border-t border-border/80 pt-3">{footer}</div> : null}
    </div>
  )
}

StatCard.displayName = "StatCard"
