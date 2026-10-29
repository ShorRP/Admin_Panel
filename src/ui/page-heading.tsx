import type { ComponentProps } from "react"
import { cn } from "cn"

export function PageHeading({
  className,
  children,
  ...props
}: ComponentProps<"h1">) {
  return (
    <h1
      {...props}
      className={cn(
        "font-heading text-[2.375rem] leading-[1.05] font-medium tracking-[-0.01em]",
        className
      )}
    >
      {children}
    </h1>
  )
}
