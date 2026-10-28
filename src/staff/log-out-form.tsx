import { LogOut } from "lucide-react"

import { Button } from "@/ui/button"
import { logOut } from "./actions"

export function LogOutForm({ className }: { className?: string }) {
  return (
    <form action={logOut} className={className}>
      <Button type="submit" variant="ghost">
        <LogOut aria-hidden data-icon="inline-start" />
        Se déconnecter
      </Button>
    </form>
  )
}
