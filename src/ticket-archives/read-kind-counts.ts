import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { REQUEST_KINDS, type RequestKindKey } from "./request-kinds"
import { searchTicketArchives } from "./search-ticket-archives"
import type { KindCounts, TicketArchivePage } from "./ticket-archive-page"

export async function readKindCounts(
  discord: DiscordApi,
  page: TicketArchivePage
): Promise<KindCounts | null> {
  if (page.kind === "unconfigured") {
    return null
  }
  const source = page.kindCounts
  if (source.kind === "known") {
    return source.counts
  }
  const { archivesChannelId, applicationId, period, chosen } = source
  const totalOf = async (key: RequestKindKey) =>
    chosen?.key === key
      ? chosen.total
      : (
          await searchTicketArchives(
            discord,
            archivesChannelId,
            applicationId,
            0,
            { text: REQUEST_KINDS[key].emoji, ...period, limit: 1 }
          )
        ).total
  try {
    const [technical, report, rp, other] = await Promise.all([
      totalOf("technical-issue"),
      totalOf("player-report"),
      totalOf("rp-request"),
      totalOf("other-request"),
    ])
    return {
      "technical-issue": technical,
      "player-report": report,
      "rp-request": rp,
      "other-request": other,
    }
  } catch (error) {
    if (error instanceof DiscordError && error.unavailable) {
      return null
    }
    throw error
  }
}
