import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "cn"

const TOUCH_CLASSES = cn("touch:min-h-11 touch:items-center")

export function AccountLink({
  href,
  current,
  className,
  children,
}: {
  href: string | null
  current?: "page" | undefined
  className?: string
  children: ReactNode
}) {
  if (href === null) {
    return <div className={cn(TOUCH_CLASSES, className)}>{children}</div>
  }
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current}
      className={cn("group/account-link", TOUCH_CLASSES, className)}
    >
      {children}
    </Link>
  )
}
