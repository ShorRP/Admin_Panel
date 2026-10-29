import { LogIn, LogOut } from "lucide-react"

import { Button } from "@/ui/button"
import { logOut } from "./actions"
import { LoginLink } from "./login-link"
import { LOGIN_ACTION_CLASS, LoginNotice } from "./login-notice"

export function LoginRefused() {
  return (
    <LoginNotice
      title="Accès refusé"
      actions={
        <>
          <LoginLink Icon={LogIn}>Se reconnecter</LoginLink>
          <form action={logOut}>
            <Button
              type="submit"
              variant="outline"
              className={LOGIN_ACTION_CLASS}
            >
              <LogOut aria-hidden data-icon="inline-start" />
              Se déconnecter
            </Button>
          </form>
        </>
      }
    >
      Ce compte Discord n’a pas le rôle staff sur le serveur Discord de Shor.
    </LoginNotice>
  )
}
