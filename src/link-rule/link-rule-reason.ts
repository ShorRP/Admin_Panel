import { quoted } from "@/blocked-words/french-text"
import { linkRuleActionLabel, type LinkRuleActionId } from "./link-rule-action"

export const CREATION_REASON = "création et activation de la règle des liens"

export const ACTIVATION_REASON = "activation de la règle des liens"

export const CUT_REASON = "coupure de la règle des liens"

export function actionChangeReason(
  from: LinkRuleActionId,
  to: LinkRuleActionId
) {
  return `changement de l’action de la règle des liens, de ${quoted(linkRuleActionLabel(from))} à ${quoted(linkRuleActionLabel(to))}`
}

export function domainAdditionReason(domain: string) {
  return `ajout du domaine permis ${quoted(domain)}`
}

export function domainRemovalReason(domain: string) {
  return `retrait du domaine permis ${quoted(domain)}`
}

export function exemptRoleAdditionReason(role: string) {
  return `ajout du rôle exempté ${quoted(role)}`
}

export function exemptRoleRemovalReason(role: string) {
  return `retrait du rôle exempté ${quoted(role)}`
}

export function exemptChannelAdditionReason(channel: string) {
  return `ajout du salon exempté ${quoted(channel)}`
}

export function exemptChannelRemovalReason(channel: string) {
  return `retrait du salon exempté ${quoted(channel)}`
}
