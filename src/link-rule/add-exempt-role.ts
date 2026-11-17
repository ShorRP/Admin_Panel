import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import {
  alreadyExemptRefusal,
  fullRolesRefusal,
  GONE_ROLE_REFUSAL,
  NO_ROLE_CHOSEN_REFUSAL,
  noRuleRefusal,
  UNEXEMPTABLE_ROLE_REFUSAL,
} from "./exempt-role-refusals"
import { MAX_EXEMPT_ROLES } from "./limits"
import { linkRuleOf } from "./link-rule"
import { exemptRoleAdditionReason } from "./link-rule-reason"
import { TYPED_ROLE } from "./typed-role"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type RoleFields,
  type WriteResult,
} from "./write-result"

export async function addExemptRole(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<RoleFields>> {
  const role = TYPED_ROLE.parse(formData.get("role"))
  const fields = { role }
  if (role === "") {
    return failure(NO_ROLE_CHOSEN_REFUSAL, fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const [rules, roles] = await Promise.all([
      discord.listAutoModerationRules(),
      discord.listRoles(),
    ])
    const rule = linkRuleOf(rules)
    if (rule === undefined) {
      return failure(noRuleRefusal("ajoute"), fields)
    }
    const chosen = roles.find(({ id }) => id === role)
    if (chosen === undefined) {
      return failure(GONE_ROLE_REFUSAL, fields)
    }
    if (chosen.id === discord.guildId || chosen.managed) {
      return failure(UNEXEMPTABLE_ROLE_REFUSAL, fields)
    }
    if (rule.exempt_roles.includes(chosen.id)) {
      return failure(alreadyExemptRefusal(chosen.name), fields)
    }
    if (rule.exempt_roles.length >= MAX_EXEMPT_ROLES) {
      return failure(fullRolesRefusal(), fields)
    }
    await discord.modifyAutoModerationRule(
      rule.id,
      { exempt_roles: [...rule.exempt_roles, chosen.id] },
      auditLogReason(staffMember, exemptRoleAdditionReason(chosen.name))
    )
    return success(`${quoted(chosen.name)} est maintenant un rôle exempté.`)
  })
}
