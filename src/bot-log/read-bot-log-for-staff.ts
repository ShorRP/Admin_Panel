import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { viewsChannel } from "@/staff/can-view-channel"
import type { StaffMember } from "@/staff/staff-member"
import type { BotLogSearchParams } from "./bot-log-filters"
import { readBotLog, type BotLogConfig, type BotLogPage } from "./read-bot-log"

export type BotLogRead =
  | { kind: "unconfigured" }
  | { kind: "hidden" }
  | ({ kind: "page" } & BotLogPage)

export async function readBotLogForStaff(
  discord: DiscordApi,
  staffMember: StaffMember,
  botLog: BotLogConfig | null,
  searchParams: BotLogSearchParams
): Promise<BotLogRead> {
  if (botLog === null) {
    return { kind: "unconfigured" }
  }
  const [guild, channels] = await Promise.all([
    discord.getGuild(),
    discord.listChannels(),
  ])
  const viewed = channels.filter((channel) =>
    viewsChannel(guild, channel, staffMember)
  )
  if (!viewed.some(({ id }) => id === botLog.channelId)) {
    return { kind: "hidden" }
  }
  return {
    kind: "page",
    ...(await readBotLog(
      discord,
      botLog,
      { roles: guild.roles, channels: viewed },
      searchParams
    )),
  }
}
