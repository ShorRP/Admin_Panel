import { RotateCcw } from "lucide-react"

import { ReportChannelLink } from "@/ui/report-channel-link"
import { LoginLink } from "./login-link"
import { LoginNotice } from "./login-notice"

export function LoginFailed() {
  return (
    <LoginNotice
      title="Connexion échouée"
      actions={<LoginLink Icon={RotateCcw}>Réessayer</LoginLink>}
    >
      La connexion avec Discord n’a pas abouti. Réessaie, et si ça échoue
      encore, signale-le dans <ReportChannelLink />.
    </LoginNotice>
  )
}
