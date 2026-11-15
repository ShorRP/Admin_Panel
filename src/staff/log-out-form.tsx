import { cn } from "cn"
import { LogOut } from "lucide-react"

import { Button } from "@/ui/button"
import { logOut } from "./actions"

export function LogOutForm({
  variant = "ghost",
  className,
  iconOnly = false,
}: {
  variant?: "ghost" | "outline"
  className?: string
  iconOnly?: boolean
}) {
  return (
    <form action={logOut}>
      {iconOnly ? (
        <Button
          type="submit"
          variant={variant}
          size="icon"
          className={cn("text-muted-foreground", className)}
        >
          <LogOut aria-hidden />
          <span className="sr-only">Se déconnecter</span>
        </Button>
      ) : (
        <Button type="submit" variant={variant} className={className}>
          <LogOut aria-hidden data-icon="inline-start" />
          Se déconnecter
        </Button>
      )}
    </form>
  )
}
