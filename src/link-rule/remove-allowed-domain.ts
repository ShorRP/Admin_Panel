import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { allowedDomainsOf, allowListEntriesOf } from "./allowed-domains"
import { allowListOf, linkRuleOf, withAllowList } from "./link-rule"
import { domainRemovalReason } from "./link-rule-reason"
import { noRuleRefusal } from "./no-rule-refusal"
import { TYPED_DOMAIN } from "./submitted-domain"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type DomainFields,
  type WriteResult,
} from "./write-result"

export async function removeAllowedDomain(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<DomainFields>> {
  const domain = TYPED_DOMAIN.parse(formData.get("domain"))
  const fields = { domain }
  if (domain === "") {
    return failure("Choisis le domaine à retirer.", fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const rule = linkRuleOf(await discord.listAutoModerationRules())
    if (rule === undefined) {
      return failure(noRuleRefusal("retire", "le domaine"), fields)
    }
    const allowList = allowListOf(rule)
    if (allowedDomainsOf(allowList).domains.includes(domain)) {
      const removed = new Set(allowListEntriesOf(domain))
      await discord.modifyAutoModerationRule(
        rule.id,
        withAllowList(
          rule,
          allowList.filter((entry) => !removed.has(entry))
        ),
        auditLogReason(staffMember, domainRemovalReason(domain))
      )
    }
    return success(`${quoted(domain)} n’est plus un domaine permis.`)
  })
}
