import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-claude-orange disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-claude-orange text-white hover:bg-claude-orange/90":
              variant === "default",
            "hover:bg-cream-200": variant === "ghost",
            "border border-cream-300 bg-transparent hover:bg-cream-100":
              variant === "outline",
            "h-10 px-4 py-2": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
