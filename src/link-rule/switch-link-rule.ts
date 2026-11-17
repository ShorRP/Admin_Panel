import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"
import { z } from "zod"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { linkRuleOf, newLinkRule } from "./link-rule"
import {
  ACTIVATION_REASON,
  CREATION_REASON,
  CUT_REASON,
} from "./link-rule-reason"
import { noRoomRefusal } from "./no-room-refusal"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type WriteResult,
} from "./write-result"

const ENABLED = z.enum(["true", "false"], {
  error: "Choisis d’activer ou de couper la règle des liens.",
})

export async function switchLinkRule(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult> {
  const submitted = ENABLED.safeParse(formData.get("enabled"))
  if (!submitted.success) {
    return failure(
      submitted.error.issues.map(({ message }) => message).join(" ")
    )
  }
  const enabled = submitted.data === "true"
  return await unlessDiscordUnavailable({}, async () => {
    const rules = await discord.listAutoModerationRules()
    const rule = linkRuleOf(rules)
    if (rule === undefined) {
      return enabled
        ? await createRule(discord, staffMember, rules)
        : success(
            "La règle des liens n’existe pas encore : il n’y a rien à couper."
          )
    }
    if (rule.enabled === enabled) {
      return success(
        `La règle des liens est déjà ${enabled ? "active" : "coupée"}.`
      )
    }
    await discord.modifyAutoModerationRule(
      rule.id,
      { enabled },
      auditLogReason(staffMember, enabled ? ACTIVATION_REASON : CUT_REASON)
    )
    return success(
      enabled
        ? "La règle des liens est active."
        : "La règle des liens est coupée. Ses réglages sont gardés."
    )
  })
}

async function createRule(
  discord: DiscordApi,
  staffMember: StaffMember,
  rules: APIAutoModerationRule[]
) {
  const refusal = noRoomRefusal(rules)
  if (refusal !== null) {
    return failure(refusal)
  }
  await discord.createAutoModerationRule(
    newLinkRule(staffMember.staffRoleId),
    auditLogReason(staffMember, CREATION_REASON)
  )
  return success("La règle des liens est créée et active.")
}
