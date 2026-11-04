"use client"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"

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
  const accentClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/40",
    slate: "bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800/40",
  }

  const trendColor =
    trend?.type === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend?.type === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-400 dark:text-gray-500"

  const trendIcon =
    trend?.type === "up" ? (
      <TrendingUp className="w-3 h-3" />
    ) : trend?.type === "down" ? (
      <TrendingDown className="w-3 h-3" />
    ) : (
      <Minus className="w-3 h-3" />
    )

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-4 h-1 bg-gradient-to-r from-primary via-accent to-success" />
      {/* Background gradient */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/50 dark:from-white/5 to-transparent pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accentClasses[accent]}`}>
              {icon}
            </div>
            {icon && (
              <span className="ml-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {title.charAt(0).toUpperCase() + title.slice(1)}
              </span>
            )}
          </div>
          {trend && (
            <span className={`text-xs font-medium ${trendColor}`}>
              {trendIcon} {trend.value}{trendFormat === "percent" ? "%" : ""}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
          {title}
        </p>

        {/* Value */}
        <p className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-gray-50 tabular-nums tracking-tight">
          {value}
        </p>

        {/* Subtitle */}
        {subTitle && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {subTitle}
          </p>
        )}

        {/* Footer */}
        {footer && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

StatCard.displayName = "StatCard"
