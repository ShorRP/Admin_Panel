import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { memberAvatarUrl } from "@/discord/member-avatar-url"
import { memberName } from "@/discord/member-name"
import type { StaffEnv } from "./env"

declare const brand: unique symbol

export type StaffMember = {
  readonly id: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly opensModeration: boolean
  readonly roleIds: string[]
  readonly [brand]: true
}

export type StaffRoles = Pick<StaffEnv, "staffRoleId" | "moderationRoleIds">

export async function findStaffMember(
  discord: DiscordApi,
  { staffRoleId, moderationRoleIds }: StaffRoles,
  userId: string
): Promise<StaffMember | null> {
  const member = await discord.getMember(userId)
  if (member === null || !member.roles.includes(staffRoleId)) {
    return null
  }
  return {
    id: member.user.id,
    name: memberName(member),
    avatarUrl: memberAvatarUrl(discord.guildId, member),
    opensModeration: moderationRoleIds.some((roleId) =>
      member.roles.includes(roleId)
    ),
    roleIds: member.roles,
  } as StaffMember
}

export async function opensModerationOnceRead(
  staffMember: Promise<StaffMember>
) {
  try {
    return (await staffMember).opensModeration
  } catch {
    return false
  }
}
