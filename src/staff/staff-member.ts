import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { memberAvatarUrl } from "@/discord/member-avatar-url"

declare const brand: unique symbol

export type StaffMember = {
  readonly id: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly [brand]: true
}

export async function findStaffMember(
  discord: DiscordApi,
  staffRoleId: string,
  userId: string
): Promise<StaffMember | null> {
  const member = await discord.getMember(userId)
  if (member === null || !member.roles.includes(staffRoleId)) {
    return null
  }
  const name = member.nick ?? member.user.global_name ?? member.user.username
  return {
    id: member.user.id,
    name,
    avatarUrl: memberAvatarUrl(discord.guildId, member),
  } as StaffMember
}
