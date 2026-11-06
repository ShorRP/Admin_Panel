import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { MAX_SEARCHED_TEXT_LENGTH } from "@/discord/message-search-limits"
import { withAWord } from "@/discord/search-words"
import { cursorParamOf, dayParamOf, textParamOf } from "@/ui/filter-params"
import {
  GAME_LOG_CATEGORY_KEYS,
  type GameLogCategoryKey,
} from "./game-log-categories"
import { cellParamOf } from "./game-log-place"

export type GameLogFilters = {
  category: GameLogCategoryKey | null
  action: string | null
  character: string | null
  account: string | null
  target: string | null
  cell: string | null
  plugin: string | null
  reason: string | null
  text: string | null
  from: string | null
  to: string | null
}

export type GameLogSearchParams = {
  category?: unknown
  action?: unknown
  character?: unknown
  account?: unknown
  target?: unknown
  cell?: unknown
  plugin?: unknown
  reason?: unknown
  text?: unknown
  from?: unknown
  to?: unknown
  before?: unknown
}

export const NO_FILTERS: GameLogFilters = {
  category: null,
  action: null,
  character: null,
  account: null,
  target: null,
  cell: null,
  plugin: null,
  reason: null,
  text: null,
  from: null,
  to: null,
}

const MAX_NAME_LENGTH = 100

const CATEGORY = z.enum(GAME_LOG_CATEGORY_KEYS).nullable().catch(null)

const GAME_ACCOUNT = z
  .string()
  .trim()
  .regex(/^\d{1,20}$/)
  .nullable()
  .catch(null)

export function gameLogFiltersOf(
  searchParams: GameLogSearchParams
): GameLogFilters {
  return {
    category: CATEGORY.parse(searchParams.category),
    action: wordsParamOf(searchParams.action, MAX_NAME_LENGTH),
    character: wordsParamOf(searchParams.character, MAX_NAME_LENGTH),
    account: GAME_ACCOUNT.parse(searchParams.account),
    target: wordsParamOf(searchParams.target, MAX_NAME_LENGTH),
    cell: cellParamOf(searchParams.cell),
    plugin: wordsParamOf(searchParams.plugin, MAX_NAME_LENGTH),
    reason: wordsParamOf(searchParams.reason, MAX_SEARCHED_TEXT_LENGTH),
    text: wordsParamOf(searchParams.text, MAX_SEARCHED_TEXT_LENGTH),
    from: dayParamOf(searchParams.from),
    to: dayParamOf(searchParams.to),
  }
}

export function filtersOfPage(page: GameLogFilters): GameLogFilters {
  return {
    category: page.category,
    action: page.action,
    character: page.character,
    account: page.account,
    target: page.target,
    cell: page.cell,
    plugin: page.plugin,
    reason: page.reason,
    text: page.text,
    from: page.from,
    to: page.to,
  }
}

export function cursorOf(searchParams: GameLogSearchParams): Snowflake | null {
  return cursorParamOf(searchParams.before)
}

export function hasFilter(filters: GameLogFilters) {
  return Object.values(filters).some((value) => value !== null)
}

function wordsParamOf(value: unknown, maxLength: number) {
  return withAWord(textParamOf(value, maxLength))
}
