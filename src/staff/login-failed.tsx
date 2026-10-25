import { buttonVariants } from "@/ui/button"
import { LoginNotice } from "./login-notice"

export function LoginFailed() {
  return (
    <LoginNotice title="Connexion échouée">
      <p>
        La connexion avec Discord n’a pas abouti. Réessaie, et si ça échoue
        encore, signale-le dans le salon du staff sur Discord.
      </p>
      <div>
        <a href="/login" className={buttonVariants({ variant: "default" })}>
          Réessayer
        </a>
      </div>
    </LoginNotice>
  )
}
