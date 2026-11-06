import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import { compareIds } from "@/discord/compare-ids"
import type { DiscordApi } from "@/discord/discord-api"
import { periodBounds } from "@/discord/period-bounds"
import { parisDayOf } from "@/ui/paris-day"
import { parisPeriodOf } from "@/ui/paris-day-bounds"
import {
  cursorOf,
  gameLogFiltersOf,
  isReversed,
  type GameLogFilters,
  type GameLogSearchParams,
} from "./game-log-filters"
import {
  parseGameLogMessage,
  type GameLogEntry,
} from "./parse-game-log-message"

export const ENTRIES_PER_PAGE = 25

export type GameLogConfig = { channelId: Snowflake; webhookId: Snowflake }

export type GameLogDay = { date: Date; entries: GameLogEntry[] }

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
  const { minId, maxId } = boundsOf(filters, before)
  const nothingBetween =
    isReversed(filters) ||
    (minId !== undefined &&
      maxId !== undefined &&
      compareIds(minId, maxId) >= 0)
  if (nothingBetween) {
    return { ...filters, days: [], before, older: null }
  }
  const { messages } = await discord.searchMessages({
    channel_id: [channelId],
    author_id: [webhookId],
    ...(filters.text === null ? {} : { content: filters.text }),
    ...(minId === undefined ? {} : { min_id: minId }),
    ...(maxId === undefined ? {} : { max_id: maxId }),
    sort_order: "desc",
    limit: ENTRIES_PER_PAGE,
    offset: 0,
  })
  const newestFirst = messages.toSorted((left, right) =>
    compareIds(right.id, left.id)
  )
  return {
    ...filters,
    days: byParisDay(
      newestFirst
        .filter(
          ({ author, channel_id }) =>
            author.id === webhookId && channel_id === channelId
        )
        .map(parseGameLogMessage)
    ),
    before,
    older:
      messages.length >= ENTRIES_PER_PAGE
        ? (newestFirst.at(-1)?.id ?? null)
        : null,
  }
}

function boundsOf(filters: GameLogFilters, before: Snowflake | null) {
  const { minId, maxId: periodEnd } = periodBounds(parisPeriodOf(filters))
  const maxId =
    before === null ||
    (periodEnd !== undefined && compareIds(periodEnd, before) <= 0)
      ? periodEnd
      : before
  return { minId, maxId }
}

function byParisDay(entries: GameLogEntry[]) {
  const days: GameLogDay[] = []
  for (const entry of entries) {
    const day = days.at(-1)
    if (day !== undefined && parisDayOf(day.date) === parisDayOf(entry.date)) {
      day.entries.push(entry)
    } else {
      days.push({ date: entry.date, entries: [entry] })
    }
  }
  return days
}
