import "server-only"

import type { APIGuildMember, Snowflake } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { memberName } from "@/discord/member-name"
import type { StaffMember } from "@/staff/staff-member"
import { DIRECT_MESSAGE_OUTCOMES, sendDirectMessage } from "./direct-message"
import { kickDirectMessage } from "./kick-direct-message"
import { readSanctionRefusals } from "./sanction-refusal"
import type { KickFields, KickResult } from "./sanction-result"
import { submittedKick } from "./submitted-kick"

const NOT_KICKED =
  "Discord n’a pas répondu : l’expulsion n’a pas eu lieu. Réessaie."

const MAYBE_KICKED =
  "Discord n’a pas répondu : l’expulsion a peut-être eu lieu, peut-être pas. Recharge la page pour vérifier, puis réessaie."

const SENT_BEFORE_RETRY =
  "Le message privé est parti : décoche « Prévenir en message privé » avant de réessayer."

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
  const member = await readKickedMember(discord, staffMember, userId)
  if (typeof member === "string") {
    return failure(member, fields)
  }
  const name = memberName(member)
  const [directMessage] = await Promise.allSettled([
    fields.notify
      ? sendDirectMessage(discord, member.user.id, kickDirectMessage(reason))
      : null,
  ])
  const kicked = await kick(discord, member.user.id, staffMember, reason)
  if (directMessage.status === "rejected") {
    throw directMessage.reason
  }
  const outcome = directMessage.value
  if (kicked) {
    const message = `L’expulsion de ${name} a eu lieu.`
    return {
      ok: true,
      message:
        outcome === null
          ? message
          : `${message} ${DIRECT_MESSAGE_OUTCOMES[outcome](name)}`,
    }
  }
  if (outcome === null) {
    return failure(MAYBE_KICKED, fields)
  }
  return failure(
    `${MAYBE_KICKED} ${outcome === "sent" ? SENT_BEFORE_RETRY : DIRECT_MESSAGE_OUTCOMES[outcome](name)}`,
    fields
  )
}

async function readKickedMember(
  discord: DiscordApi,
  staffMember: StaffMember,
  userId: Snowflake | null
): Promise<APIGuildMember | string> {
  try {
    const member = userId === null ? null : await discord.getMember(userId)
    if (member === null) {
      return "Ce compte n’est pas membre du serveur Discord."
    }
    const { everySanction } = await readSanctionRefusals(discord, staffMember, {
      id: member.user.id,
      roleIds: member.roles,
    })
    return everySanction ?? member
  } catch (error) {
    if (isDiscordUnavailable(error)) {
      return NOT_KICKED
    }
    throw error
  }
}

async function kick(
  discord: DiscordApi,
  userId: Snowflake,
  staffMember: StaffMember,
  reason: string
) {
  try {
    await discord.removeMember(userId, auditLogReason(staffMember, reason))
    return true
  } catch (error) {
    if (isDiscordUnavailable(error)) {
      return false
    }
    throw error
  }
}

function isDiscordUnavailable(error: unknown) {
  return error instanceof DiscordError && error.unavailable
}

function failure(message: string, fields: KickFields): KickResult {
  return { ok: false, message, ...fields }
}
