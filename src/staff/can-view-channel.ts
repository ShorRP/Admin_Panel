import "server-only"

import { PermissionFlagsBits, type Snowflake } from "discord-api-types/v10"

import type { DiscordApi, Guild, GuildChannel } from "@/discord/discord-api"
import type { StaffMember } from "./staff-member"

const NO_PERMISSIONS = BigInt(0)

export async function canViewChannel(
  discord: DiscordApi,
  staffMember: StaffMember,
  channelId: Snowflake
): Promise<boolean> {
  const [guild, channels] = await Promise.all([
    discord.getGuild(),
    discord.listChannels(),
  ])
  const channel = channels.find(({ id }) => id === channelId)
  return channel !== undefined && viewsChannel(guild, channel, staffMember)
}

export function viewsChannel(
  guild: Guild,
  channel: GuildChannel,
  staffMember: StaffMember
): boolean {
  if (guild.owner_id === staffMember.id) {
    return true
  }
  const base = basePermissions(guild, staffMember)
  if (holds(base, PermissionFlagsBits.Administrator)) {
    return true
  }
  return holds(
    channelPermissions(base, guild.id, channel, staffMember),
    PermissionFlagsBits.ViewChannel
  )
}

function holds(permissions: bigint, permission: bigint) {
  return (permissions & permission) === permission
}

function basePermissions(guild: Guild, staffMember: StaffMember) {
  const everyone = guild.roles.find(({ id }) => id === guild.id)
  let permissions =
    everyone === undefined ? NO_PERMISSIONS : BigInt(everyone.permissions)
  for (const role of guild.roles) {
    if (staffMember.roleIds.includes(role.id)) {
      permissions |= BigInt(role.permissions)
    }
  }
  return permissions
}

function channelPermissions(
  base: bigint,
  guildId: Snowflake,
  { permission_overwrites: overwrites }: GuildChannel,
  staffMember: StaffMember
) {
  let permissions = base
  const everyone = overwrites.find(({ id }) => id === guildId)
  if (everyone !== undefined) {
    permissions = overwrittenBy(
      permissions,
      BigInt(everyone.allow),
      BigInt(everyone.deny)
    )
  }
  let allow = NO_PERMISSIONS
  let deny = NO_PERMISSIONS
  for (const overwrite of overwrites) {
    if (staffMember.roleIds.includes(overwrite.id)) {
      allow |= BigInt(overwrite.allow)
      deny |= BigInt(overwrite.deny)
    }
  }
  permissions = overwrittenBy(permissions, allow, deny)
  const own = overwrites.find(({ id }) => id === staffMember.id)
  if (own !== undefined) {
    permissions = overwrittenBy(
      permissions,
      BigInt(own.allow),
      BigInt(own.deny)
    )
  }
  return permissions
}

function overwrittenBy(permissions: bigint, allow: bigint, deny: bigint) {
  return (permissions & ~deny) | allow
}
