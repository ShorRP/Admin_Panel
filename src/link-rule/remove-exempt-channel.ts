import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { NO_CHANNEL_TO_REMOVE_REFUSAL } from "./exempt-channel-refusals"
import { labelOfChannel } from "./exemptable-channel"
import { linkRuleOf } from "./link-rule"
import { exemptChannelRemovalReason } from "./link-rule-reason"
import { noRuleRefusal } from "./no-rule-refusal"
import { TYPED_CHOICE } from "./typed-choice"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type ChannelFields,
  type WriteResult,
} from "./write-result"

export async function removeExemptChannel(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<ChannelFields>> {
  const channel = TYPED_CHOICE.parse(formData.get("channel"))
  const fields = { channel }
  if (channel === "") {
    return failure(NO_CHANNEL_TO_REMOVE_REFUSAL, fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const [rules, channels] = await Promise.all([
      discord.listAutoModerationRules(),
      discord.listChannels(),
    ])
    const rule = linkRuleOf(rules)
    if (rule === undefined) {
      return failure(noRuleRefusal("retire", "le salon"), fields)
    }
    const known = channels.find(({ id }) => id === channel)
    const label = known === undefined ? channel : labelOfChannel(known)
    if (rule.exempt_channels.includes(channel)) {
      await discord.modifyAutoModerationRule(
        rule.id,
        {
          exempt_channels: rule.exempt_channels.filter(
            (held) => held !== channel
          ),
        },
        auditLogReason(staffMember, exemptChannelRemovalReason(label))
      )
    }
    return success(`${quoted(label)} n’est plus un salon exempté.`)
  })
}
