import { cn } from "cn"
import { RotateCcw } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { LOGIN_ACTION_CLASS, LoginNotice } from "./login-notice"

export function LoginFailed() {
  return (
    <LoginNotice
      title="Connexion échouée"
      actions={
        <a
          href="/login"
          className={cn(
            buttonVariants({ variant: "default" }),
            LOGIN_ACTION_CLASS
          )}
        >
          <RotateCcw aria-hidden data-icon="inline-start" />
          Réessayer
        </a>
      }
    >
      La connexion avec Discord n’a pas abouti. Réessaie, et si ça échoue
      encore, signale-le dans le salon du staff sur Discord.
    </LoginNotice>
  )
}
