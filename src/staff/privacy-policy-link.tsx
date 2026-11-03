import type { ComponentProps } from "react"
import Link from "next/link"
import { cn } from "cn"
import { Lock } from "lucide-react"

const NAME = "Confidentialité"

export function PrivacyPolicyLink({
  current = false,
  rail = false,
  className,
  ...props
}: Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch" | "aria-current" | "children"
> & { current?: boolean; rail?: boolean }) {
  return (
    <Link
      title={rail ? NAME : undefined}
      {...props}
      href="/privacy"
      prefetch={false}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground",
        rail &&
          "max-lg:flex max-lg:size-11 max-lg:items-center max-lg:justify-center",
        className
      )}
    >
      {rail ? (
        <>
          <Lock aria-hidden className="size-4 lg:hidden" />
          <span className="max-lg:sr-only">{NAME}</span>
        </>
      ) : (
        NAME
      )}
    </Link>
  )
}
