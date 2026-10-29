import { LogIn } from "lucide-react"

import { LoginLink } from "./login-link"
import { LoginNotice } from "./login-notice"

export function LoggedOut() {
  return (
    <LoginNotice
      title="Ta session est terminée."
      actions={<LoginLink Icon={LogIn}>Se connecter avec Discord</LoginLink>}
    >
      Reconnecte-toi avec ton compte Discord pour revenir au panel.
    </LoginNotice>
  )
}
