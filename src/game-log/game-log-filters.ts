import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

const MAX_SEARCHED_TEXT_LENGTH = 1024

const WORD = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

export type GameLogFilters = {
  text: string | null
}

export type GameLogSearchParams = {
  text?: unknown
  before?: unknown
}

export const NO_FILTERS: GameLogFilters = { text: null }

const TEXT = z
  .string()
  .trim()
  .min(1)
  .max(MAX_SEARCHED_TEXT_LENGTH)
  .refine((text) => WORD.test(text))
  .nullable()
  .catch(null)

const CURSOR = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)
  .nullable()
  .catch(null)

export function gameLogFiltersOf(
  searchParams: GameLogSearchParams
): GameLogFilters {
  return { text: TEXT.parse(searchParams.text) }
}

export function cursorOf(searchParams: GameLogSearchParams): Snowflake | null {
  return CURSOR.parse(searchParams.before)
}

export function hasFilter({ text }: GameLogFilters) {
  return text !== null
}
