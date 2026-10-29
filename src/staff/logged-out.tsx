import { cn } from "cn"
import { LogIn } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { LOGIN_ACTION_CLASS, LoginNotice } from "./login-notice"

export function LoggedOut() {
  return (
    <LoginNotice
      title="Ta session est terminée."
      actions={
        <a
          href="/login"
          className={cn(
            buttonVariants({ variant: "default" }),
            LOGIN_ACTION_CLASS
          )}
        >
          <LogIn aria-hidden data-icon="inline-start" />
          Se connecter avec Discord
        </a>
      }
    >
      Reconnecte-toi avec ton compte Discord pour revenir au panel.
    </LoginNotice>
  )
}
