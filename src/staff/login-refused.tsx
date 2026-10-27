import { LogIn, LogOut } from "lucide-react"

import { Button, buttonVariants } from "@/ui/button"
import { logOut } from "./actions"
import { LoginNotice } from "./login-notice"

export function LoginRefused() {
  return (
    <LoginNotice title="Accès refusé">
      <p>
        Ce compte Discord n’a pas le rôle staff sur le serveur Discord de Shor.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href="/login" className={buttonVariants({ variant: "ghost" })}>
          <LogIn aria-hidden data-icon="inline-start" />
          Se reconnecter
        </a>
        <form action={logOut}>
          <Button type="submit" variant="ghost">
            <LogOut aria-hidden data-icon="inline-start" />
            Se déconnecter
          </Button>
        </form>
      </div>
    </LoginNotice>
  )
}
