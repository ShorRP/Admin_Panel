import "server-only"

import { z } from "zod"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { linkRuleOf, withAction } from "./link-rule"
import {
  ACTION_SET_IN_DISCORD,
  LINK_RULE_ACTION_IDS,
  linkRuleActionLabel,
  linkRuleActionOf,
  requireRightTo,
} from "./link-rule-action"
import { actionChangeReason } from "./link-rule-reason"
import { noRuleRefusal } from "./no-rule-refusal"
import { TYPED_CHOICE } from "./typed-choice"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type ActionFields,
  type WriteResult,
} from "./write-result"

const ACTION = z.enum(LINK_RULE_ACTION_IDS, { error: "Choisis une action." })

export async function changeLinkRuleAction(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<ActionFields>> {
  const typed = TYPED_CHOICE.parse(formData.get("action"))
  const fields = { action: typed }
  const submitted = ACTION.safeParse(typed)
  if (!submitted.success) {
    return failure(
      submitted.error.issues.map(({ message }) => message).join(" "),
      fields
    )
  }
  const to = submitted.data
  requireRightTo(staffMember, to)
  return await unlessDiscordUnavailable(fields, async () => {
    const rule = linkRuleOf(await discord.listAutoModerationRules())
    if (rule === undefined) {
      return failure(noRuleRefusal("change", "l’action"), fields)
    }
    const current = linkRuleActionOf(rule)
    if (current === null) {
      return failure(ACTION_SET_IN_DISCORD, fields)
    }
    requireRightTo(staffMember, current)
    const label = quoted(linkRuleActionLabel(to))
    if (current === to) {
      return success(`La règle des liens a déjà l’action ${label}.`)
    }
    await discord.modifyAutoModerationRule(
      rule.id,
      withAction(rule, to),
      auditLogReason(staffMember, actionChangeReason(current, to))
    )
    return success(`La règle des liens passe à ${label}.`)
  })
}
