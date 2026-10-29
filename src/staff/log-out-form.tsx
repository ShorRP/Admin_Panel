import { LogOut } from "lucide-react"

import { Button } from "@/ui/button"
import { logOut } from "./actions"

export function LogOutForm({
  className,
  iconOnly = false,
}: {
  className?: string
  iconOnly?: boolean
}) {
  return (
    <form action={logOut} className={className}>
      {iconOnly ? (
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
        >
          <LogOut aria-hidden />
          <span className="sr-only">Se déconnecter</span>
        </Button>
      ) : (
        <Button type="submit" variant="ghost">
          <LogOut aria-hidden data-icon="inline-start" />
          Se déconnecter
        </Button>
      )}
    </form>
  )
}
