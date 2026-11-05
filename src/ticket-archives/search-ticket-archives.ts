import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { ticketArchiveOf, type TicketArchive } from "./ticket-archive"

export const ARCHIVES_PER_PAGE = 25

export type SearchedTicketArchives = {
  total: number
  messages: number
  archives: TicketArchive[]
}

export async function searchTicketArchives(
  discord: DiscordApi,
  archivesChannelId: Snowflake,
  applicationId: Snowflake,
  offset: number
): Promise<SearchedTicketArchives> {
  const { total_results, messages } = await discord.searchMessages({
    channel_id: [archivesChannelId],
    author_id: [applicationId],
    sort_order: "desc",
    limit: ARCHIVES_PER_PAGE,
    offset,
  })
  return {
    total: total_results,
    messages: messages.length,
    archives: messages.flatMap(({ id, author, embeds }) => {
      const archive =
        author.id === applicationId ? ticketArchiveOf(id, embeds) : null
      return archive === null ? [] : [archive]
    }),
  }
}
