import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { dayParamOf, textParamOf } from "@/ui/filter-params"

const MAX_SEARCHED_TEXT_LENGTH = 1024

const WORD = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

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

const CURSOR = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)
  .nullable()
  .catch(null)

export function gameLogFiltersOf(
  searchParams: GameLogSearchParams
): GameLogFilters {
  const text = textParamOf(searchParams.text, MAX_SEARCHED_TEXT_LENGTH)
  return {
    text: text !== null && WORD.test(text) ? text : null,
    from: dayParamOf(searchParams.from),
    to: dayParamOf(searchParams.to),
  }
}

export function cursorOf(searchParams: GameLogSearchParams): Snowflake | null {
  return CURSOR.parse(searchParams.before)
}

export function hasFilter({ text, from, to }: GameLogFilters) {
  return text !== null || from !== null || to !== null
}

export function isReversed({ from, to }: GameLogFilters) {
  return from !== null && to !== null && from > to
}
