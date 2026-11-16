import {
  AutoModerationActionType,
  type APIAutoModerationRule,
} from "discord-api-types/v10"

export const LINK_RULE_ACTION_IDS = [
  "block",
  "timeout-1h",
  "timeout-1d",
] as const

export type LinkRuleActionId = (typeof LINK_RULE_ACTION_IDS)[number]

const LABELS: Record<LinkRuleActionId, string> = {
  block: "Bloquer seulement",
  "timeout-1h": "Exclusion 1 heure",
  "timeout-1d": "Exclusion 1 jour",
}

export function linkRuleActionLabel(id: LinkRuleActionId) {
  return LABELS[id]
}

export function linkRuleActionOf(
  rule: APIAutoModerationRule
): LinkRuleActionId | null {
  const acting = rule.actions.filter(
    ({ type }) => type !== AutoModerationActionType.SendAlertMessage
  )
  const [first, second, ...rest] = acting
  if (
    first?.type !== AutoModerationActionType.BlockMessage ||
    rest.length > 0
  ) {
    return null
  }
  if (second === undefined) {
    return "block"
  }
  if (second.type !== AutoModerationActionType.Timeout) {
    return null
  }
  switch (second.metadata?.duration_seconds) {
    case 3600:
      return "timeout-1h"
    case 86400:
      return "timeout-1d"
    default:
      return null
  }
}
