import { isTimedOut } from "./account-standing"
import type { FoundAccount } from "./found-account"

export function ParisHoursNote({ accounts }: { accounts: FoundAccount[] }) {
  if (!accounts.some(({ standing }) => isTimedOut(standing))) {
    return null
  }
  return <p className="text-sm text-muted-foreground">Heures de Paris.</p>
}
