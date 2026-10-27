import { LogIn } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { LoginNotice } from "./login-notice"

export function LoggedOut() {
  return (
    <LoginNotice title="Déconnexion">
      <p>Ta session sur le panel est terminée.</p>
      <div>
        <a href="/login" className={buttonVariants({ variant: "ghost" })}>
          <LogIn aria-hidden data-icon="inline-start" />
          Se connecter
        </a>
      </div>
    </LoginNotice>
  )
}
