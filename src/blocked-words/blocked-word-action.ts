import type { StaffMember } from "@/staff/staff-member"

const PANEL_RULE_NAME = "Mots interdits du panel"

function ruleNamed(action: string) {
  return `${PANEL_RULE_NAME} · ${action}`
}

function messageAnnouncing(sanction: string) {
  return `Message bloqué : il contient un mot interdit. Tu reçois ${sanction} du serveur Discord de Shor.`
}

const ACTIONS = [
  {
    id: "block",
    label: "Bloquer seulement",
    ruleName: PANEL_RULE_NAME,
    right: "staff",
    sanctions: false,
    timeoutSeconds: null,
    customMessage: null,
  },
  {
    id: "timeout-1h",
    label: "Exclusion 1 heure",
    ruleName: ruleNamed("exclusion 1 heure"),
    right: "moderation",
    sanctions: true,
    timeoutSeconds: 3600,
    customMessage: messageAnnouncing("une exclusion temporaire d’une heure"),
  },
  {
    id: "timeout-1d",
    label: "Exclusion 1 jour",
    ruleName: ruleNamed("exclusion 1 jour"),
    right: "moderation",
    sanctions: true,
    timeoutSeconds: 86400,
    customMessage: messageAnnouncing("une exclusion temporaire d’un jour"),
  },
] as const

export type BlockedWordAction = (typeof ACTIONS)[number]

export type BlockedWordActionId = BlockedWordAction["id"]

export type BlockedWordRights = Pick<
  StaffMember,
  "opensModeration" | "opensBans"
>

export const BLOCKED_WORD_ACTIONS: readonly BlockedWordAction[] = ACTIONS

export const BLOCKED_WORD_ACTION_IDS = ACTIONS.map(({ id }) => id)

export function blockedWordAction(id: BlockedWordActionId): BlockedWordAction {
  const action = ACTIONS.find((candidate) => candidate.id === id)
  if (action === undefined) {
    throw new Error(`No blocked word action ${id}`)
  }
  return action
}

export function rightsOf({
  opensModeration,
  opensBans,
}: BlockedWordRights): BlockedWordRights {
  return { opensModeration, opensBans }
}

export function mayUse(rights: BlockedWordRights, action: BlockedWordAction) {
  switch (action.right) {
    case "staff":
      return true
    case "moderation":
      return rights.opensModeration
  }
}

export function requireRightTo(
  rights: BlockedWordRights,
  action: BlockedWordAction
) {
  if (!mayUse(rights, action)) {
    throw new Error(
      `This staff member may not use the blocked word action ${action.id}`
    )
  }
}

export function allowedActions(rights: BlockedWordRights) {
  return BLOCKED_WORD_ACTIONS.filter((action) => mayUse(rights, action))
}

export function strongestOf(ids: BlockedWordActionId[]) {
  return ACTIONS.findLast((action) => ids.includes(action.id)) ?? null
}
