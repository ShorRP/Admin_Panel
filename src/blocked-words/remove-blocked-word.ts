import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { quoted } from "./french-text"
import { isPanelRule, keywordsOf, withKeywords } from "./panel-rule"
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
  if (!submitted.ok) {
    return failure(submitted.message, submitted.typed)
  }
  const { typed } = submitted
  return await unlessDiscordUnavailable(typed, async () => {
    const rule = (await discord.listAutoModerationRules()).find(isPanelRule)
    const keywords = rule === undefined ? [] : keywordsOf(rule)
    if (rule !== undefined && keywords.includes(typed)) {
      await discord.modifyAutoModerationRule(
        rule.id,
        withKeywords(
          rule,
          keywords.filter((keyword) => keyword !== typed)
        ),
        auditLogReason(staffMember, `retrait de ${quoted(typed)}`)
      )
    }
    return {
      ok: true,
      message: `${quoted(typed)} n’est plus un mot interdit.`,
    }
  })
}
