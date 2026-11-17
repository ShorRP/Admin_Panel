import { quoted } from "@/blocked-words/french-text"

export const CREATION_REASON = "création et activation de la règle des liens"

export const ACTIVATION_REASON = "activation de la règle des liens"

export const CUT_REASON = "coupure de la règle des liens"

export function domainAdditionReason(domain: string) {
  return `ajout du domaine permis ${quoted(domain)}`
}

export function domainRemovalReason(domain: string) {
  return `retrait du domaine permis ${quoted(domain)}`
}
