import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { canViewChannel } from "@/staff/can-view-channel"
import type { StaffMember } from "@/staff/staff-member"
import type { GameLogSearchParams } from "./game-log-filters"
import {
  readGameLog,
  type GameLogConfig,
  type GameLogPage,
} from "./read-game-log"

export type GameLogRead =
  | { kind: "unconfigured" }
  | { kind: "hidden" }
  | ({ kind: "page" } & GameLogPage)

export async function readGameLogForStaff(
  discord: DiscordApi,
  staffMember: StaffMember,
  gameLog: GameLogConfig | null,
  searchParams: GameLogSearchParams
): Promise<GameLogRead> {
  if (gameLog === null) {
    return { kind: "unconfigured" }
  }
  if (!(await canViewChannel(discord, staffMember, gameLog.channelId))) {
    return { kind: "hidden" }
  }
  return {
    kind: "page",
    ...(await readGameLog(discord, gameLog, searchParams)),
  }
}
