import type { ComponentProps } from "react"
import Link from "next/link"
import { cn } from "cn"

export const TEXT_LINK_CLASSES = cn(
  "text-foreground underline decoration-input underline-offset-3 hover:decoration-primary"
)

export function TextLink({
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  return (
    <Link
      {...props}
      prefetch={false}
      className={cn(TEXT_LINK_CLASSES, className)}
    />
  )
}
