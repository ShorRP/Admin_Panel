import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import {
  alreadyExemptChannelRefusal,
  FULL_CHANNELS_REFUSAL,
  GONE_CHANNEL_REFUSAL,
  NO_CHANNEL_CHOSEN_REFUSAL,
  UNEXEMPTABLE_CHANNEL_REFUSAL,
} from "./exempt-channel-refusals"
import { isExemptableChannel, labelOfChannel } from "./exemptable-channel"
import { MAX_EXEMPT_CHANNELS } from "./limits"
import { linkRuleOf } from "./link-rule"
import { exemptChannelAdditionReason } from "./link-rule-reason"
import { noRuleRefusal } from "./no-rule-refusal"
import { TYPED_CHOICE } from "./typed-choice"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type ChannelFields,
  type WriteResult,
} from "./write-result"

export async function addExemptChannel(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<ChannelFields>> {
  const channel = TYPED_CHOICE.parse(formData.get("channel"))
  const fields = { channel }
  if (channel === "") {
    return failure(NO_CHANNEL_CHOSEN_REFUSAL, fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const [rules, channels] = await Promise.all([
      discord.listAutoModerationRules(),
      discord.listChannels(),
    ])
    const rule = linkRuleOf(rules)
    if (rule === undefined) {
      return failure(noRuleRefusal("ajoute", "le salon"), fields)
    }
    const chosen = channels.find(({ id }) => id === channel)
    if (chosen === undefined) {
      return failure(GONE_CHANNEL_REFUSAL, fields)
    }
    if (!isExemptableChannel(chosen)) {
      return failure(UNEXEMPTABLE_CHANNEL_REFUSAL, fields)
    }
    const label = labelOfChannel(chosen)
    if (rule.exempt_channels.includes(chosen.id)) {
      return failure(alreadyExemptChannelRefusal(label), fields)
    }
    if (rule.exempt_channels.length >= MAX_EXEMPT_CHANNELS) {
      return failure(FULL_CHANNELS_REFUSAL, fields)
    }
    await discord.modifyAutoModerationRule(
      rule.id,
      { exempt_channels: [...rule.exempt_channels, chosen.id] },
      auditLogReason(staffMember, exemptChannelAdditionReason(label))
    )
    return success(`${quoted(label)} est maintenant un salon exempté.`)
  })
}
