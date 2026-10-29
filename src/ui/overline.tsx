import type { ComponentProps } from "react"
import { cn } from "cn"

export function Overline({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      {...props}
      className={cn(
        "text-[0.65625rem] leading-3.5 font-medium tracking-[0.18em] text-muted-foreground uppercase",
        className
      )}
    />
  )
}
