import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/**
 * Cabecera editorial de página. Un solo lugar para eyebrow + título +
 * descripción + acciones, para que todas las pantallas respiren igual.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="eyebrow-accent">{eyebrow}</span>
          </div>
        ) : null}
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
