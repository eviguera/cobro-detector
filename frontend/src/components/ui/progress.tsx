import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  label?: string
  hint?: string
  tone?: "primary" | "success" | "warning"
  indeterminate?: boolean
  className?: string
}

/**
 * Barra de progreso accesible. Cuando el backend no reporta avance real,
 * se usa `indeterminate` en lugar de inventar un porcentaje.
 */
export function Progress({ value, label, hint, tone = "primary", indeterminate, className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const toneClass =
    tone === "success" ? "bg-success-500" : tone === "warning" ? "bg-warning-500" : "bg-primary"

  return (
    <div className={cn("w-full", className)}>
      {label || hint ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label ? <span className="text-xs font-medium text-foreground">{label}</span> : <span />}
          {hint ? <span className="num text-xs text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-label={label ?? "Progreso"}
      >
        {indeterminate ? (
          <div className={cn("h-full w-1/3 animate-shimmer rounded-full", toneClass)} />
        ) : (
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", toneClass)}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  )
}
