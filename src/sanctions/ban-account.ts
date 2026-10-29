import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import { memberName, userName } from "@/discord/member-name"
import type { StaffMember } from "@/staff/staff-member"
import { banDirectMessage } from "./ban-direct-message"
import { unlessDiscordUnavailable } from "./discord-unavailable"
import { sanctionAfterDirectMessage } from "./sanction-after-direct-message"
import { readSanctionRefusals } from "./sanction-refusal"
import type { BanFields, BanResult } from "./sanction-result"
import { submittedBan } from "./submitted-ban"

type BanTarget = { id: Snowflake; name: string }

const NO_ACCOUNT = "Aucun compte Discord n’a cet ID."

const NOT_BANNED =
  "Discord n’a pas répondu : le bannissement n’a pas eu lieu. Réessaie."

const MAYBE_BANNED =
  "Discord n’a pas répondu : le bannissement a peut-être eu lieu, peut-être pas. Recharge la page pour vérifier, puis réessaie."

export async function banAccount(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<BanResult> {
  if (!staffMember.opensBans) {
    throw new Error("Only a staff member who bans bans an account")
  }
  const submitted = submittedBan(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, userId, reason, deleteMessageSeconds } = submitted
  const target = await unlessDiscordUnavailable(
    () => readBanTarget(discord, staffMember, userId),
    NOT_BANNED
  )
  if (typeof target === "string") {
    return failure(target, fields)
  }
  return await sanctionAfterDirectMessage({
    discord,
    userId: target.id,
    name: target.name,
    directMessage: fields.notify ? banDirectMessage(reason) : null,
    sanction: () =>
      discord.createBan(
        target.id,
        { delete_message_seconds: deleteMessageSeconds },
        auditLogReason(staffMember, reason)
      ),
    landed: `Le bannissement de ${target.name} a eu lieu.`,
    maybeLanded: MAYBE_BANNED,
    fields,
  })
}

async function readBanTarget(
  discord: DiscordApi,
  staffMember: StaffMember,
  userId: Snowflake | null
): Promise<BanTarget | string> {
  if (userId === null) {
    return NO_ACCOUNT
  }
  const member = await discord.getMember(userId)
  if (member !== null) {
    const { everySanction } = await readSanctionRefusals(discord, staffMember, {
      id: member.user.id,
      roleIds: member.roles,
    })
    return everySanction ?? { id: member.user.id, name: memberName(member) }
  }
  if ((await discord.getBan(userId)) !== null) {
    return "Ce compte est déjà banni."
  }
  const user = await discord.getUser(userId)
  return user === null ? NO_ACCOUNT : { id: user.id, name: userName(user) }
}

function failure(message: string, fields: BanFields): BanResult {
  return { ok: false, message, ...fields }
}
