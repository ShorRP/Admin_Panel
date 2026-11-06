import type { Snowflake } from "discord-api-types/v10"

import { MAX_SEARCHED_TEXT_LENGTH } from "@/discord/message-search-limits"
import { cursorParamOf, dayParamOf, textParamOf } from "@/ui/filter-params"

export type GameLogFilters = {
  text: string | null
  from: string | null
  to: string | null
}

export type GameLogSearchParams = {
  text?: unknown
  from?: unknown
  to?: unknown
  before?: unknown
}

export const NO_FILTERS: GameLogFilters = { text: null, from: null, to: null }

export function gameLogFiltersOf(
  searchParams: GameLogSearchParams
): GameLogFilters {
  return {
    text: textParamOf(searchParams.text, MAX_SEARCHED_TEXT_LENGTH),
    from: dayParamOf(searchParams.from),
    to: dayParamOf(searchParams.to),
  }
}

export function cursorOf(searchParams: GameLogSearchParams): Snowflake | null {
  return cursorParamOf(searchParams.before)
}

export function hasFilter({ text, from, to }: GameLogFilters) {
  return text !== null || from !== null || to !== null
}

export function isReversed({ from, to }: GameLogFilters) {
  return from !== null && to !== null && from > to
}
