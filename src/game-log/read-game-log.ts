import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { ChannelMessage, DiscordApi } from "@/discord/discord-api"
import { messageTextsOf } from "@/discord/message-texts"
import { searchBounds } from "@/discord/period-bounds"
import { scanMessages } from "@/discord/scan-messages"
import { holdsWords, longestTermOf } from "@/discord/search-words"
import { groupByParisDay, type DayGroup } from "@/ui/group-by-paris-day"
import { parisPeriodOf } from "@/ui/paris-day-bounds"
import { categoryKeyOf, GAME_LOG_CATEGORIES } from "./game-log-categories"
import {
  cursorOf,
  gameLogFiltersOf,
  type GameLogFilters,
  type GameLogSearchParams,
} from "./game-log-filters"
import { cellMatches, pluginMatches } from "./game-log-place"
import {
  parseGameLogMessage,
  type GameLogEntry,
  type GameLogEvent,
} from "./parse-game-log-message"

export type GameLogConfig = { channelId: Snowflake; webhookId: Snowflake }

export type GameLogDay = DayGroup<GameLogEntry>

export type GameLogPage = GameLogFilters & {
  days: GameLogDay[]
  before: Snowflake | null
  older: Snowflake | null
  cut: boolean
}

type KeepContext = GameLogConfig & { filters: GameLogFilters }

export async function readGameLog(
  discord: DiscordApi,
  { channelId, webhookId }: GameLogConfig,
  searchParams: GameLogSearchParams
): Promise<GameLogPage> {
  const filters = gameLogFiltersOf(searchParams)
  const before = cursorOf(searchParams)
  const period = parisPeriodOf(filters)
  if (searchBounds(period, before) === null) {
    return { ...filters, days: [], before, older: null, cut: false }
  }
  const context = { channelId, webhookId, filters }
  const { entries, older, cut } = await scanMessages(discord, {
    channelId,
    authorId: webhookId,
    served: servedTermOf(filters),
    period,
    before,
    keep: (message) => keptEntry(context, message),
  })
  return { ...filters, days: groupByParisDay(entries), before, older, cut }
}

function servedTermOf({
  account,
  target,
  character,
  text,
  reason,
  category,
}: GameLogFilters) {
  return (
    account ??
    termOf(target) ??
    termOf(character) ??
    termOf(text) ??
    termOf(reason) ??
    (category === null
      ? undefined
      : longestTermOf(GAME_LOG_CATEGORIES[category].label))
  )
}

function termOf(words: string | null) {
  return words === null ? undefined : longestTermOf(words)
}

function keptEntry(
  { channelId, webhookId, filters }: KeepContext,
  message: ChannelMessage
) {
  if (message.author.id !== webhookId || message.channel_id !== channelId) {
    return null
  }
  const entry = parseGameLogMessage(message)
  const texts = messageTextsOf(message)
  if (
    filters.text !== null &&
    !texts.some((text) => holdsWords(text, filters.text ?? ""))
  ) {
    return null
  }
  if (entry.kind === "raw") {
    return hasEventFilter(filters) ? null : entry
  }
  return eventKept(entry, filters) ? entry : null
}

function hasEventFilter({
  category,
  action,
  character,
  account,
  target,
  cell,
  plugin,
  reason,
}: GameLogFilters) {
  return [
    category,
    action,
    character,
    account,
    target,
    cell,
    plugin,
    reason,
  ].some((value) => value !== null)
}

function eventKept(event: GameLogEvent, filters: GameLogFilters) {
  return (
    (filters.category === null ||
      categoryKeyOf(event.category) === filters.category) &&
    (filters.action === null || holdsWords(event.action, filters.action)) &&
    wordsHeld(event.character, filters.character) &&
    (filters.account === null || event.gameAccount === filters.account) &&
    wordsHeld(event.target, filters.target) &&
    (filters.cell === null || cellMatches(event.place, filters.cell)) &&
    (filters.plugin === null || pluginMatches(event.place, filters.plugin)) &&
    wordsHeld(event.reason, filters.reason)
  )
}

function wordsHeld(text: string | null, words: string | null) {
  return words === null || (text !== null && holdsWords(text, words))
}
