import type { ComponentProps } from "react"
import Link from "next/link"
import { cn } from "cn"

export function PrivacyPolicyLink({
  current = false,
  className,
  ...props
}: Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch" | "aria-current" | "children"
> & { current?: boolean }) {
  return (
    <Link
      {...props}
      href="/privacy"
      prefetch={false}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      Confidentialité
    </Link>
  )
}
