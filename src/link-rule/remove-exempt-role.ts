import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import {
  NO_ROLE_TO_REMOVE_REFUSAL,
  STAFF_ROLE_REFUSAL,
} from "./exempt-role-refusals"
import { linkRuleOf } from "./link-rule"
import { exemptRoleRemovalReason } from "./link-rule-reason"
import { noRuleRefusal } from "./no-rule-refusal"
import { TYPED_CHOICE } from "./typed-choice"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type RoleFields,
  type WriteResult,
} from "./write-result"

export async function removeExemptRole(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<RoleFields>> {
  const role = TYPED_CHOICE.parse(formData.get("role"))
  const fields = { role }
  if (role === "") {
    return failure(NO_ROLE_TO_REMOVE_REFUSAL, fields)
  }
  if (role === staffMember.staffRoleId) {
    return failure(STAFF_ROLE_REFUSAL, fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const [rules, roles] = await Promise.all([
      discord.listAutoModerationRules(),
      discord.listRoles(),
    ])
    const rule = linkRuleOf(rules)
    if (rule === undefined) {
      return failure(noRuleRefusal("retire", "le rôle"), fields)
    }
    const name = roles.find(({ id }) => id === role)?.name ?? role
    if (rule.exempt_roles.includes(role)) {
      await discord.modifyAutoModerationRule(
        rule.id,
        { exempt_roles: rule.exempt_roles.filter((held) => held !== role) },
        auditLogReason(staffMember, exemptRoleRemovalReason(name))
      )
    }
    return success(`${quoted(name)} n’est plus un rôle exempté.`)
  })
}
