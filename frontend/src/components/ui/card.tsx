import * as React from "react"

import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Superficie base del producto: borde de 1px, radio 16px y sombra mínima.
 * Evita gradientes decorativos para que los datos sean el protagonista.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-border bg-card text-card-foreground",
          "shadow-[0_1px_2px_rgba(17,19,21,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]",
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)} {...props} />
  }
)
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn("font-display text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    )
  }
)
CardTitle.displayName = "CardTitle"

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  }
)
CardContent.displayName = "CardContent"

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  }
)
CardFooter.displayName = "CardFooter"
