import "server-only"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { quoted } from "@/blocked-words/french-text"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { isAlertChannel } from "./alert-channel"
import {
  ALERT_SET_IN_DISCORD,
  NO_ALERT_CHOICE_REFUSAL,
  NOT_AN_ALERT_CHANNEL_REFUSAL,
} from "./alert-channel-refusals"
import { GONE_CHANNEL_REFUSAL } from "./exempt-channel-refusals"
import { labelOfChannel } from "./exemptable-channel"
import { linkRuleOf, withAlert } from "./link-rule"
import { alertOf, NO_ALERT_CHOICE } from "./link-rule-alert"
import {
  alertChannelChoiceReason,
  alertChannelRemovalReason,
} from "./link-rule-reason"
import { noRuleRefusal } from "./no-rule-refusal"
import { TYPED_CHOICE } from "./typed-choice"
import {
  failure,
  success,
  unlessDiscordUnavailable,
  type ChannelFields,
  type WriteResult,
} from "./write-result"

export async function changeAlertChannel(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult<ChannelFields>> {
  const channel = TYPED_CHOICE.parse(formData.get("channel"))
  const fields = { channel }
  if (channel === "") {
    return failure(NO_ALERT_CHOICE_REFUSAL, fields)
  }
  return await unlessDiscordUnavailable(fields, async () => {
    const [rules, channels] = await Promise.all([
      discord.listAutoModerationRules(),
      discord.listChannels(),
    ])
    const rule = linkRuleOf(rules)
    if (rule === undefined) {
      return failure(noRuleRefusal("change", "le salon d’alerte"), fields)
    }
    const alert = alertOf(rule)
    if (alert.kind === "set-in-discord") {
      return failure(ALERT_SET_IN_DISCORD, fields)
    }
    const labelOf = (id: string) => {
      const known = channels.find((candidate) => candidate.id === id)
      return known === undefined ? id : labelOfChannel(known)
    }
    if (channel === NO_ALERT_CHOICE) {
      if (alert.kind === "none") {
        return success("La règle des liens n’a pas de salon d’alerte.")
      }
      await discord.modifyAutoModerationRule(
        rule.id,
        withAlert(rule, null),
        auditLogReason(
          staffMember,
          alertChannelRemovalReason(labelOf(alert.id))
        )
      )
      return success("La règle des liens n’a plus de salon d’alerte.")
    }
    if (alert.kind === "channel" && alert.id === channel) {
      return success(
        `${quoted(labelOf(channel))} est déjà le salon d’alerte de la règle des liens.`
      )
    }
    const chosen = channels.find(({ id }) => id === channel)
    if (chosen === undefined) {
      return failure(GONE_CHANNEL_REFUSAL, fields)
    }
    if (!isAlertChannel(chosen)) {
      return failure(NOT_AN_ALERT_CHANNEL_REFUSAL, fields)
    }
    const label = labelOfChannel(chosen)
    await discord.modifyAutoModerationRule(
      rule.id,
      withAlert(rule, chosen.id),
      auditLogReason(staffMember, alertChannelChoiceReason(label))
    )
    return success(
      `${quoted(label)} est maintenant le salon d’alerte de la règle des liens.`
    )
  })
}
