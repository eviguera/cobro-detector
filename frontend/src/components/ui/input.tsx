import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground",
          "shadow-[inset_0_1px_2px_rgba(17,19,21,0.03)] transition-colors",
          "placeholder:text-muted-foreground/70",
          "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
