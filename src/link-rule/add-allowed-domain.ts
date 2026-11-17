import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import {
  alreadyAllowedRefusal,
  fullListRefusal,
  noRuleRefusal,
} from "./allowed-domain-refusals"
import { allowedDomainsOf, allowListEntriesOf } from "./allowed-domains"
import { MAX_ALLOW_LIST_ENTRIES } from "./limits"
import { linkRuleOf } from "./link-rule"
import { domainAdditionReason } from "./link-rule-reason"
import { submittedDomain } from "./submitted-domain"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type DomainFields,
  type WriteResult,
} from "./write-result"

export async function addAllowedDomain(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<DomainFields>> {
  const submitted = submittedDomain(formData)
  const fields = { domain: submitted.typed }
  if (!submitted.ok) {
    return failure(submitted.message, fields)
  }
  const { domain } = submitted
  return await unlessDiscordUnavailable(fields, async () => {
    const rule = linkRuleOf(await discord.listAutoModerationRules())
    if (rule === undefined) {
      return failure(noRuleRefusal("ajoute"), fields)
    }
    const allowList = rule.trigger_metadata.allow_list ?? []
    const { domains, otherExceptions } = allowedDomainsOf(allowList)
    if (domains.includes(domain)) {
      return failure(alreadyAllowedRefusal(domain), fields)
    }
    const held = new Set(allowList)
    const missing = allowListEntriesOf(domain).filter(
      (entry) => !held.has(entry)
    )
    if (allowList.length + missing.length > MAX_ALLOW_LIST_ENTRIES) {
      return failure(
        fullListRefusal(
          domain,
          {
            entries: allowList.length,
            domains: domains.length,
            otherExceptions: otherExceptions.length,
          },
          missing.length
        ),
        fields
      )
    }
    await discord.modifyAutoModerationRule(
      rule.id,
      {
        trigger_metadata: {
          ...rule.trigger_metadata,
          allow_list: [...allowList, ...missing],
        },
      },
      auditLogReason(staffMember, domainAdditionReason(domain))
    )
    return success(`${quoted(domain)} est maintenant un domaine permis.`)
  })
}
