import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import { compareIds } from "@/discord/compare-ids"
import type { DiscordApi } from "@/discord/discord-api"
import { SEARCH_PAGE_SIZE } from "@/discord/message-search-limits"
import { searchBounds } from "@/discord/period-bounds"
import { groupByParisDay, type DayGroup } from "@/ui/group-by-paris-day"
import { parisPeriodOf } from "@/ui/paris-day-bounds"
import {
  cursorOf,
  gameLogFiltersOf,
  type GameLogFilters,
  type GameLogSearchParams,
} from "./game-log-filters"
import {
  parseGameLogMessage,
  type GameLogEntry,
} from "./parse-game-log-message"

export type GameLogConfig = { channelId: Snowflake; webhookId: Snowflake }

export type GameLogDay = DayGroup<GameLogEntry>

export type GameLogPage = GameLogFilters & {
  days: GameLogDay[]
  before: Snowflake | null
  older: Snowflake | null
}

export async function readGameLog(
  discord: DiscordApi,
  { channelId, webhookId }: GameLogConfig,
  searchParams: GameLogSearchParams
): Promise<GameLogPage> {
  const filters = gameLogFiltersOf(searchParams)
  const before = cursorOf(searchParams)
  const bounds = searchBounds(parisPeriodOf(filters), before)
  if (bounds === null) {
    return { ...filters, days: [], before, older: null }
  }
  const { messages } = await discord.searchMessages({
    channel_id: [channelId],
    author_id: [webhookId],
    ...(filters.text === null ? {} : { content: filters.text }),
    ...(bounds.minId === undefined ? {} : { min_id: bounds.minId }),
    ...(bounds.maxId === undefined ? {} : { max_id: bounds.maxId }),
    sort_order: "desc",
    limit: SEARCH_PAGE_SIZE,
    offset: 0,
  })
  const newestFirst = messages.toSorted((left, right) =>
    compareIds(right.id, left.id)
  )
  return {
    ...filters,
    days: groupByParisDay(
      newestFirst
        .filter(
          ({ author, channel_id }) =>
            author.id === webhookId && channel_id === channelId
        )
        .map(parseGameLogMessage)
    ),
    before,
    older:
      messages.length >= SEARCH_PAGE_SIZE
        ? (newestFirst.at(-1)?.id ?? null)
        : null,
  }
}
