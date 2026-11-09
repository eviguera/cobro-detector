import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "subtle"
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * Botón único con `variant` (nunca factory pattern, ver AGENTS.md).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "default", size = "default", type = "button", ...props }, ref) {
    return (
      <button
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
          "transition-[background-color,box-shadow,transform,color] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
          variant === "default" &&
            "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 active:translate-y-px",
          variant === "destructive" &&
            "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92",
          variant === "outline" &&
            "border border-border bg-card text-foreground shadow-sm hover:bg-secondary",
          variant === "secondary" &&
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "ghost" && "text-foreground hover:bg-secondary",
          variant === "subtle" && "bg-accent text-accent-foreground hover:bg-accent/70",
          variant === "link" && "text-primary underline-offset-4 hover:underline",
          size === "sm" && "h-9 px-3 text-[13px]",
          size === "default" && "h-10 px-4",
          size === "lg" && "h-12 px-6 text-[15px]",
          size === "icon" && "h-10 w-10",
          className,
        )}
        {...props}
        ref={ref}
      />
    )
  }
)
Button.displayName = "Button"
