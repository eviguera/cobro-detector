import * as React from "react"

import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
  size?: "default" | "sm" | "lg"
}

const variants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border border-border bg-transparent text-foreground",
  success:
    "bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/12 dark:text-success-600 dark:border-success-500/30",
  warning:
    "bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/12 dark:text-warning-600 dark:border-warning-500/30",
  info:
    "bg-accent text-accent-foreground border border-primary/15 dark:bg-primary/12 dark:text-primary",
}

const sizes = {
  default: "h-6 px-2.5",
  sm: "h-5 px-2",
  lg: "h-7 px-3",
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant = "default", size = "default", ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full text-[11px] font-semibold leading-none transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
