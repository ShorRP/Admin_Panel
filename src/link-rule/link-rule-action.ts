import {
  AutoModerationActionType,
  type APIAutoModerationAction,
  type APIAutoModerationRule,
} from "discord-api-types/v10"

import type { StaffMember } from "@/staff/staff-member"

export const LINK_RULE_ACTION_IDS = [
  "block",
  "timeout-1h",
  "timeout-1d",
] as const

export type LinkRuleActionId = (typeof LINK_RULE_ACTION_IDS)[number]

export type LinkRuleActionRights = Pick<StaffMember, "opensModeration">

const BLOCKED_LINK_MESSAGE =
  "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor."

function messageAnnouncing(sanction: string) {
  return `${BLOCKED_LINK_MESSAGE} Tu reçois ${sanction}.`
}

type ActionFields = {
  label: string
  right: "staff" | "moderation"
  timeoutSeconds: number | null
  customMessage: string
}

const FIELDS: Record<LinkRuleActionId, ActionFields> = {
  block: {
    label: "Bloquer seulement",
    right: "staff",
    timeoutSeconds: null,
    customMessage: BLOCKED_LINK_MESSAGE,
  },
  "timeout-1h": {
    label: "Exclusion 1 heure",
    right: "moderation",
    timeoutSeconds: 3600,
    customMessage: messageAnnouncing("une exclusion temporaire d’une heure"),
  },
  "timeout-1d": {
    label: "Exclusion 1 jour",
    right: "moderation",
    timeoutSeconds: 86400,
    customMessage: messageAnnouncing("une exclusion temporaire d’un jour"),
  },
}

export function linkRuleActionLabel(id: LinkRuleActionId) {
  return FIELDS[id].label
}

function mayUse(rights: LinkRuleActionRights, id: LinkRuleActionId) {
  switch (FIELDS[id].right) {
    case "staff":
      return true
    case "moderation":
      return rights.opensModeration
  }
}

export function actionChoicesOf(
  rights: LinkRuleActionRights,
  current: LinkRuleActionId | null
): LinkRuleActionId[] {
  if (current === null || !mayUse(rights, current)) {
    return []
  }
  const usable = LINK_RULE_ACTION_IDS.filter((id) => mayUse(rights, id))
  return usable.some((id) => id !== current) ? usable : []
}

export function requireRightTo(
  rights: LinkRuleActionRights,
  id: LinkRuleActionId
) {
  if (!mayUse(rights, id)) {
    throw new Error(`This staff member may not use the link rule action ${id}`)
  }
}

export function actionsOf(id: LinkRuleActionId): APIAutoModerationAction[] {
  const { customMessage, timeoutSeconds } = FIELDS[id]
  return [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: customMessage },
    },
    ...(timeoutSeconds === null
      ? []
      : [
          {
            type: AutoModerationActionType.Timeout,
            metadata: { duration_seconds: timeoutSeconds },
          },
        ]),
  ]
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
  return (
    LINK_RULE_ACTION_IDS.find(
      (id) =>
        FIELDS[id].timeoutSeconds !== null &&
        FIELDS[id].timeoutSeconds === second.metadata?.duration_seconds
    ) ?? null
  )
}
