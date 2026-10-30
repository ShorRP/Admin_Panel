import "server-only"

import type { APIBan, Snowflake } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import { userName } from "@/discord/member-name"
import type { StaffMember } from "@/staff/staff-member"
import { deName } from "./de-name"
import { unlessDiscordUnavailable } from "./discord-unavailable"
import type { BanLiftFields, BanLiftResult } from "./sanction-result"
import { submittedBanLift } from "./submitted-ban-lift"

const NOT_LIFTED =
  "Discord n’a pas répondu : la levée du bannissement n’a pas eu lieu. Réessaie."

const MAYBE_LIFTED =
  "Discord n’a pas répondu : la levée du bannissement est peut-être passée, peut-être pas. Recharge la page pour vérifier, puis réessaie."

export async function liftBan(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<BanLiftResult> {
  if (!staffMember.opensBans) {
    throw new Error("Only a staff member who bans lifts a ban")
  }
  const submitted = submittedBanLift(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, userId, reason } = submitted
  const ban = await unlessDiscordUnavailable(
    () => readBan(discord, userId),
    NOT_LIFTED
  )
  if (typeof ban === "string") {
    return failure(ban, fields)
  }
  const lifted = await unlessDiscordUnavailable(async () => {
    await discord.removeBan(ban.user.id, auditLogReason(staffMember, reason))
    return true
  }, false)
  if (!lifted) {
    return failure(MAYBE_LIFTED, fields)
  }
  return {
    ok: true,
    message: `Le bannissement ${deName(userName(ban.user))} est levé.`,
  }
}

async function readBan(
  discord: DiscordApi,
  userId: Snowflake | null
): Promise<APIBan | string> {
  const ban = userId === null ? null : await discord.getBan(userId)
  return ban ?? "Ce compte n’est pas banni."
}

function failure(message: string, fields: BanLiftFields): BanLiftResult {
  return { ok: false, message, ...fields }
}
