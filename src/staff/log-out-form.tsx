import { LogOut } from "lucide-react"

import { Button } from "@/ui/button"
import { logOut } from "./actions"

export function LogOutForm() {
  return (
    <form action={logOut}>
      <Button type="submit" variant="ghost">
        <LogOut aria-hidden data-icon="inline-start" />
        Se déconnecter
      </Button>
    </form>
  )
}
