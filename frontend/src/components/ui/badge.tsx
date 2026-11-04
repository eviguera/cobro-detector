import * as React from "react"

import { cn } from "@/lib/utils"

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
  size?: "default" | "sm" | "lg"
}

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  success:
    "bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400 border border-success-200 dark:border-success-600/30",
  warning:
    "bg-warning-100 dark:bg-warning-500/20 text-warning-600 dark:text-warning-400 border border-warning-200 dark:border-warning-600/30",
  info:
    "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30",
}

const sizes = {
  default: "h-9 px-3",
  sm: "h-8 px-2.5",
  lg: "h-10 px-4",
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant, size, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, type BadgeProps }
