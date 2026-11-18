import { quoted } from "@/blocked-words/french-text"
import { frenchNumber } from "@/ui/french-number"
import { MAX_ALLOW_LIST_ENTRIES } from "./limits"

export function alreadyAllowedRefusal(domain: string) {
  return `${quoted(domain)} est déjà un domaine permis.`
}

export function fullListRefusal(
  domain: string,
  held: { entries: number; domains: number; otherExceptions: number },
  missing: number
) {
  const ways = [
    ...(held.domains > 0 ? ["un domaine"] : []),
    ...(held.otherExceptions > 0
      ? [`une entrée d’${quoted("Autres exceptions")} dans Discord`]
      : []),
  ]
  return `La liste permise de la règle des liens compte déjà ${frenchNumber(held.entries)} entrées sur ${frenchNumber(MAX_ALLOW_LIST_ENTRIES)}, et ${quoted(domain)} en demande ${frenchNumber(missing)} de plus. Retire ${ways.join(" ou ")}, puis réessaie.`
}
