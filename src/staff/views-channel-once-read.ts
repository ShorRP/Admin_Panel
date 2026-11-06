import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { canViewChannel } from "./can-view-channel"
import type { StaffMember } from "./staff-member"

export async function viewsChannelOnceRead(
  discord: DiscordApi,
  channel: { channelId: Snowflake } | null,
  staffMember: Promise<StaffMember>
): Promise<boolean> {
  if (channel === null) {
    return false
  }
  let member: StaffMember
  try {
    member = await staffMember
  } catch {
    return false
  }
  try {
    return await canViewChannel(discord, member, channel.channelId)
  } catch (error) {
    if (error instanceof DiscordError) {
      return false
    }
    throw error
  }
}
