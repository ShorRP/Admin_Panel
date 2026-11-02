import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { requireRightTo } from "./blocked-word-action"
import { additionReason } from "./blocked-word-reason"
import { quoted } from "./french-text"
import {
  heldWordsOf,
  keywordsOf,
  newPanelRule,
  panelRulesOf,
  strongestHeld,
  withKeywords,
  type PanelRule,
} from "./panel-rule"
import { roomRefusal } from "./room-refusal"
import { submittedBlockedWord } from "./submitted-word"
import {
  failure,
  unlessDiscordUnavailable,
  type WriteResult,
} from "./write-result"

export async function addBlockedWord(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult> {
  const submitted = submittedBlockedWord(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, word, action } = submitted
  requireRightTo(staffMember, action)
  return await unlessDiscordUnavailable(fields, async () => {
    const rules = await discord.listAutoModerationRules()
    const panelRules = panelRulesOf(rules)
    const rule = panelRules.find(
      (panelRule) => panelRule.action.id === action.id
    )?.rule
    const refusal =
      duplicateRefusal(panelRules, word) ?? roomRefusal(rules, rule, action)
    if (refusal !== null) {
      return failure(refusal, fields)
    }
    const reason = auditLogReason(staffMember, additionReason(word, action))
    if (rule === undefined) {
      await discord.createAutoModerationRule(
        newPanelRule(action, staffMember.staffRoleId, [word]),
        reason
      )
    } else {
      await discord.modifyAutoModerationRule(
        rule.id,
        withKeywords(rule, [...keywordsOf(rule), word]),
        reason
      )
    }
    return {
      ok: true,
      message: `${quoted(word)} est maintenant un mot interdit, action ${quoted(action.label)}.`,
    }
  })
}

function duplicateRefusal(panelRules: PanelRule[], word: string) {
  const strongest = strongestHeld(
    heldWordsOf(panelRules).filter(
      (held) => held.word.toLowerCase() === word.toLowerCase()
    )
  )
  if (strongest === null) {
    return null
  }
  return `${quoted(strongest.word)} est déjà un mot interdit, action ${quoted(strongest.action.label)}.`
}
