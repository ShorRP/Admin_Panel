import type { ComponentProps } from "react"
import Link from "next/link"
import { cn } from "cn"

export const TEXT_LINK_CLASSES = cn(
  "text-foreground underline decoration-input underline-offset-3 hover:decoration-primary"
)

const STANDING_ALONE_CLASSES = cn(
  "touch:inline-flex touch:min-h-11 touch:items-center"
)

export function TextLink({
  className,
  inSentence = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch"> & { inSentence?: boolean }) {
  return (
    <Link
      {...props}
      prefetch={false}
      className={cn(
        TEXT_LINK_CLASSES,
        inSentence ? null : STANDING_ALONE_CLASSES,
        className
      )}
    />
  )
}
