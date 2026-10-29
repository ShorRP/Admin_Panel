import "server-only"

import type { APIGuildMember, Snowflake } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import { memberName } from "@/discord/member-name"
import type { StaffMember } from "@/staff/staff-member"
import { unlessDiscordUnavailable } from "./discord-unavailable"
import { kickDirectMessage } from "./kick-direct-message"
import { sanctionAfterDirectMessage } from "./sanction-after-direct-message"
import { readSanctionRefusals } from "./sanction-refusal"
import type { KickFields, KickResult } from "./sanction-result"
import { submittedKick } from "./submitted-kick"

const NOT_KICKED =
  "Discord n’a pas répondu : l’expulsion n’a pas eu lieu. Réessaie."

const MAYBE_KICKED =
  "Discord n’a pas répondu : l’expulsion a peut-être eu lieu, peut-être pas. Recharge la page pour vérifier, puis réessaie."

export async function kickMember(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<KickResult> {
  if (!staffMember.opensModeration) {
    throw new Error("Only a staff member who moderates kicks a member")
  }
  const submitted = submittedKick(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, userId, reason } = submitted
  const member = await unlessDiscordUnavailable(
    () => readKickedMember(discord, staffMember, userId),
    NOT_KICKED
  )
  if (typeof member === "string") {
    return failure(member, fields)
  }
  const name = memberName(member)
  return await sanctionAfterDirectMessage({
    discord,
    userId: member.user.id,
    name,
    directMessage: fields.notify ? kickDirectMessage(reason) : null,
    sanction: () =>
      discord.removeMember(member.user.id, auditLogReason(staffMember, reason)),
    landed: `L’expulsion de ${name} a eu lieu.`,
    maybeLanded: MAYBE_KICKED,
    fields,
  })
}

async function readKickedMember(
  discord: DiscordApi,
  staffMember: StaffMember,
  userId: Snowflake | null
): Promise<APIGuildMember | string> {
  const member = userId === null ? null : await discord.getMember(userId)
  if (member === null) {
    return "Ce compte n’est pas membre du serveur Discord."
  }
  const { everySanction } = await readSanctionRefusals(discord, staffMember, {
    id: member.user.id,
    roleIds: member.roles,
  })
  return everySanction ?? member
}

function failure(message: string, fields: KickFields): KickResult {
  return { ok: false, message, ...fields }
}
