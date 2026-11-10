import * as React from "react"

import { cn } from "@/lib/utils"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning" | "info"
}

const variants: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "bg-card text-foreground",
  destructive: "border-destructive/40 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500",
  success:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500",
  warning:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-500",
  info:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  function Alert({ className, variant = "default", ...props }, ref) {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-xl border p-4",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Alert.displayName = "Alert"

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string
}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  function AlertTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn("mb-1 text-sm font-semibold", className)}
        {...props}
      />
    )
  }
)
AlertTitle.displayName = "AlertTitle"

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string
}

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDescriptionProps
>(
  function AlertDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn("text-sm [&_p]:leading-relaxed", className)}
        {...props}
      />
    )
  }
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
