import type { ReactNode } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { LOGIN_ACTION_CLASS } from "./login-notice"

export function LoginLink({
  Icon,
  children,
}: {
  Icon: LucideIcon
  children: ReactNode
}) {
  return (
    <a
      href="/login"
      className={cn(buttonVariants({ variant: "default" }), LOGIN_ACTION_CLASS)}
    >
      <Icon aria-hidden data-icon="inline-start" />
      {children}
    </a>
  )
}
