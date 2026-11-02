import type { ComponentProps } from "react"
import { cn } from "cn"

export function EmptyListFrame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border border-dashed border-input px-5 py-7 text-center text-muted-foreground",
        className
      )}
    />
  )
}
