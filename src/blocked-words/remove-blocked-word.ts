import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { requireRightTo } from "./blocked-word-action"
import { removalReason } from "./blocked-word-reason"
import { quoted } from "./french-text"
import {
  keywordsOf,
  panelRulesOf,
  strongestHeld,
  withKeywords,
} from "./panel-rule"
import { submittedWord } from "./submitted-word"
import {
  failure,
  unlessDiscordUnavailable,
  type WriteResult,
} from "./write-result"

export async function removeBlockedWord(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult> {
  const submitted = submittedWord(formData)
  const fields = { word: submitted.typed, action: "" }
  if (!submitted.ok) {
    return failure(submitted.message, fields)
  }
  const { typed } = submitted
  return await unlessDiscordUnavailable(fields, async () => {
    const holding = panelRulesOf(
      await discord.listAutoModerationRules()
    ).filter(({ rule }) => keywordsOf(rule).includes(typed))
    const strongest = strongestHeld(holding)
    if (strongest === null) {
      return {
        ok: true,
        message: `${quoted(typed)} n’est plus un mot interdit.`,
      }
    }
    requireRightTo(staffMember, strongest.action)
    for (const { rule, action } of holding) {
      await discord.modifyAutoModerationRule(
        rule.id,
        withKeywords(
          rule,
          keywordsOf(rule).filter((keyword) => keyword !== typed)
        ),
        auditLogReason(staffMember, removalReason(typed, action))
      )
    }
    return {
      ok: true,
      message: `${quoted(typed)} n’est plus un mot interdit, action ${quoted(strongest.action.label)}.`,
    }
  })
}
