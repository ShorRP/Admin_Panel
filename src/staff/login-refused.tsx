import { LogIn } from "lucide-react"

import { LogOutForm } from "./log-out-form"
import { LoginLink } from "./login-link"
import { LOGIN_ACTION_CLASS, LoginNotice } from "./login-notice"

export function LoginRefused() {
  return (
    <LoginNotice
      title="Accès refusé"
      actions={
        <>
          <LoginLink Icon={LogIn}>Se reconnecter</LoginLink>
          <LogOutForm variant="outline" className={LOGIN_ACTION_CLASS} />
        </>
      }
    >
      Ce compte Discord n’a pas le rôle staff sur le serveur Discord de Shor.
    </LoginNotice>
  )
}
