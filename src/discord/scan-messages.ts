import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import { compareIds } from "./compare-ids"
import type { ChannelMessage, DiscordApi } from "./discord-api"
import { MAX_SEARCHES, SEARCH_PAGE_SIZE } from "./message-search-limits"
import { searchBounds, type PeriodBounds } from "./period-bounds"

export type MessageScan<Entry> = {
  entries: Entry[]
  older: Snowflake | null
  cut: boolean
}

export async function scanMessages<Entry extends { messageId: Snowflake }>(
  discord: DiscordApi,
  {
    channelId,
    authorId,
    served,
    period,
    before,
    keep,
  }: {
    channelId: Snowflake
    authorId: Snowflake
    served: string | undefined
    period: { start: Date | null; end: Date | null }
    before: Snowflake | null
    keep: (message: ChannelMessage) => Entry | null
  }
): Promise<MessageScan<Entry>> {
  const entries: Entry[] = []
  let cursor = before
  for (let search = 0; search < MAX_SEARCHES; search++) {
    const bounds = searchBounds(period, cursor)
    if (bounds === null) {
      return { entries, older: null, cut: false }
    }
    const { messages } = await discord.searchMessages(
      queryOf(channelId, authorId, served, bounds)
    )
    const newestFirst = messages.toSorted((left, right) =>
      compareIds(right.id, left.id)
    )
    for (const message of newestFirst) {
      const entry = keep(message)
      if (entry === null) {
        continue
      }
      entries.push(entry)
      if (entries.length === SEARCH_PAGE_SIZE) {
        return { entries, older: entry.messageId, cut: false }
      }
    }
    if (messages.length < SEARCH_PAGE_SIZE) {
      return { entries, older: null, cut: false }
    }
    cursor = newestFirst.at(-1)?.id ?? cursor
  }
  return { entries, older: cursor, cut: true }
}

function queryOf(
  channelId: Snowflake,
  authorId: Snowflake,
  served: string | undefined,
  { minId, maxId }: PeriodBounds
) {
  return {
    channel_id: [channelId],
    author_id: [authorId],
    ...(served === undefined ? {} : { content: served }),
    ...(minId === undefined ? {} : { min_id: minId }),
    ...(maxId === undefined ? {} : { max_id: maxId }),
    sort_order: "desc" as const,
    limit: SEARCH_PAGE_SIZE,
    offset: 0,
  }
}
