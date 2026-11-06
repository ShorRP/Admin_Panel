import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { MAX_SEARCHED_TEXT_LENGTH } from "@/discord/message-search-limits"
import { hasWord } from "@/discord/search-words"
import { cursorParamOf, dayParamOf, textParamOf } from "@/ui/filter-params"
import { BOT_LOG_FAMILY_KEYS, type BotLogFamilyKey } from "./bot-log-families"

export type BotLogFilters = {
  family: BotLogFamilyKey | null
  action: string | null
  account: string | null
  channel: string | null
  text: string | null
  from: string | null
  to: string | null
}

export type BotLogSearchParams = {
  family?: unknown
  action?: unknown
  account?: unknown
  channel?: unknown
  text?: unknown
  from?: unknown
  to?: unknown
  before?: unknown
}

export const NO_FILTERS: BotLogFilters = {
  family: null,
  action: null,
  account: null,
  channel: null,
  text: null,
  from: null,
  to: null,
}

const MAX_NAME_LENGTH = 100

const FAMILY = z.enum(BOT_LOG_FAMILY_KEYS).nullable().catch(null)

const NAME = z
  .string()
  .trim()
  .min(1)
  .max(MAX_NAME_LENGTH)
  .nullable()
  .catch(null)

export function botLogFiltersOf(
  searchParams: BotLogSearchParams
): BotLogFilters {
  return {
    family: FAMILY.parse(searchParams.family),
    action: withAWord(NAME.parse(searchParams.action)),
    account: NAME.parse(searchParams.account),
    channel: NAME.parse(searchParams.channel),
    text: withAWord(textParamOf(searchParams.text, MAX_SEARCHED_TEXT_LENGTH)),
    from: dayParamOf(searchParams.from),
    to: dayParamOf(searchParams.to),
  }
}

export function cursorOf(searchParams: BotLogSearchParams): Snowflake | null {
  return cursorParamOf(searchParams.before)
}

export function hasFilter(filters: BotLogFilters) {
  return Object.values(filters).some((value) => value !== null)
}

function withAWord(text: string | null) {
  return text !== null && hasWord(text) ? text : null
}
