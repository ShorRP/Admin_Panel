import type { StaffMember } from "@/staff/staff-member"

const PANEL_RULE_NAME = "Mots interdits du panel"

function ruleNamed(action: string) {
  return `${PANEL_RULE_NAME} · ${action}`
}

function messageAnnouncing(sanction: string) {
  return `Message bloqué : il contient un mot interdit. Tu reçois ${sanction} du serveur Discord de Shor.`
}

export const BLOCKED_WORD_ACTION_IDS = [
  "block",
  "timeout-1h",
  "timeout-1d",
] as const

export type BlockedWordActionId = (typeof BLOCKED_WORD_ACTION_IDS)[number]

type ActionFields = {
  label: string
  ruleName: string
  right: "staff" | "moderation"
  sanctions: boolean
  timeoutSeconds: number | null
  customMessage: string | null
}

const FIELDS: Record<BlockedWordActionId, ActionFields> = {
  block: {
    label: "Bloquer seulement",
    ruleName: PANEL_RULE_NAME,
    right: "staff",
    sanctions: false,
    timeoutSeconds: null,
    customMessage: null,
  },
  "timeout-1h": {
    label: "Exclusion 1 heure",
    ruleName: ruleNamed("exclusion 1 heure"),
    right: "moderation",
    sanctions: true,
    timeoutSeconds: 3600,
    customMessage: messageAnnouncing("une exclusion temporaire d’une heure"),
  },
  "timeout-1d": {
    label: "Exclusion 1 jour",
    ruleName: ruleNamed("exclusion 1 jour"),
    right: "moderation",
    sanctions: true,
    timeoutSeconds: 86400,
    customMessage: messageAnnouncing("une exclusion temporaire d’un jour"),
  },
}

export type BlockedWordAction = ActionFields & { id: BlockedWordActionId }

export type BlockedWordRights = Pick<StaffMember, "opensModeration">

export function blockedWordAction(id: BlockedWordActionId): BlockedWordAction {
  return { id, ...FIELDS[id] }
}

export const BLOCKED_WORD_ACTIONS =
  BLOCKED_WORD_ACTION_IDS.map(blockedWordAction)

export function rightsOf({ opensModeration }: BlockedWordRights) {
  return { opensModeration }
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

export function allowedActionIds(rights: BlockedWordRights) {
  return BLOCKED_WORD_ACTIONS.filter((action) => mayUse(rights, action)).map(
    ({ id }) => id
  )
}

export function strongestOf(ids: BlockedWordActionId[]) {
  const id = BLOCKED_WORD_ACTION_IDS.findLast((candidate) =>
    ids.includes(candidate)
  )
  return id === undefined ? null : blockedWordAction(id)
}
