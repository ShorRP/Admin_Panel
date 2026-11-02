import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "cn"

export function AccountLink({
  href,
  className,
  children,
}: {
  href: string | null
  className?: string
  children: ReactNode
}) {
  if (href === null) {
    return <div className={className}>{children}</div>
  }
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn("group/account-link", className)}
    >
      {children}
    </Link>
  )
}
