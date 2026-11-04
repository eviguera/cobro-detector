import * as React from "react"

import { cn } from "@/lib/utils"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning" | "info"
}

const variants = {
  default:
    "bg-background text-foreground",
  destructive:
    "bg-destructive/10 border-destructive/50 text-destructive",
  success:
    "bg-success-50 dark:bg-success-500/10 border-success-200/50 dark:border-success-500 text-success-600 dark:text-success-400",
  warning:
    "bg-warning-50 dark:bg-warning-500/10 border-warning-200/50 dark:border-warning-500 text-warning-600 dark:text-warning-400",
  info:
    "bg-blue-50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-500 text-blue-600 dark:text-blue-400",
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  function Alert({ className, variant, ...props }, ref) {
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
