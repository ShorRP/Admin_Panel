import "server-only"

import { z } from "zod"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { noRuleRefusal } from "./allowed-domain-refusals"
import { allowedDomainsOf, allowListEntriesOf } from "./allowed-domains"
import { linkRuleOf } from "./link-rule"
import { domainRemovalReason } from "./link-rule-reason"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type DomainFields,
  type WriteResult,
} from "./write-result"

const SENT = z.string().catch("")

export async function removeAllowedDomain(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<DomainFields>> {
  const domain = SENT.parse(formData.get("domain"))
  const fields = { domain }
  if (domain === "") {
    return failure("Choisis le domaine à retirer.", fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const rule = linkRuleOf(await discord.listAutoModerationRules())
    if (rule === undefined) {
      return failure(noRuleRefusal("retire"), fields)
    }
    const allowList = rule.trigger_metadata.allow_list ?? []
    if (allowedDomainsOf(allowList).domains.includes(domain)) {
      const removed = new Set(allowListEntriesOf(domain))
      await discord.modifyAutoModerationRule(
        rule.id,
        {
          trigger_metadata: {
            ...rule.trigger_metadata,
            allow_list: allowList.filter((entry) => !removed.has(entry)),
          },
        },
        auditLogReason(staffMember, domainRemovalReason(domain))
      )
    }
    return success(`${quoted(domain)} n’est plus un domaine permis.`)
  })
}
