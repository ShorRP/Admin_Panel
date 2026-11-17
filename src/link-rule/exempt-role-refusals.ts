import { quoted } from "@/blocked-words/french-text"
import { frenchNumber } from "@/ui/french-number"
import { MAX_EXEMPT_ROLES } from "./limits"

export const NO_ROLE_CHOSEN_REFUSAL = "Choisis le rôle à exempter."

export const NO_ROLE_TO_REMOVE_REFUSAL = "Choisis le rôle à retirer."

export const GONE_ROLE_REFUSAL =
  "Ce rôle n’existe plus sur le serveur Discord : recharge la page, puis choisis-en un autre."

export const UNEXEMPTABLE_ROLE_REFUSAL = `Ce rôle ne peut pas être exempté : le panel n’exempte ni ${quoted("@everyone")} ni un rôle géré par une intégration.`

export const STAFF_ROLE_REFUSAL =
  "Le rôle du staff est toujours exempté : il ne se retire pas."

export function noRuleRefusal(change: "ajoute" | "retire") {
  return `La règle des liens n’existe pas encore : active-la d’abord, puis ${change} le rôle.`
}

export function alreadyExemptRefusal(role: string) {
  return `${quoted(role)} est déjà un rôle exempté.`
}

export function fullRolesRefusal(staffRoleCounts: boolean) {
  return `La règle des liens exempte déjà ${frenchNumber(MAX_EXEMPT_ROLES)} rôles sur ${frenchNumber(MAX_EXEMPT_ROLES)}${staffRoleCounts ? ", celui du staff compris" : ""}. Retire un rôle exempté, puis réessaie.`
}
