import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { canViewChannel } from "@/staff/can-view-channel"
import type { StaffMember } from "@/staff/staff-member"
import type { GameLogConfig } from "./read-game-log"

export async function viewsGameLogOnceRead(
  discord: DiscordApi,
  gameLog: Pick<GameLogConfig, "channelId"> | null,
  staffMember: Promise<StaffMember>
): Promise<boolean> {
  if (gameLog === null) {
    return false
  }
  let member: StaffMember
  try {
    member = await staffMember
  } catch {
    return false
  }
  try {
    return await canViewChannel(discord, member, gameLog.channelId)
  } catch (error) {
    if (error instanceof DiscordError) {
      return false
    }
    throw error
  }
}
