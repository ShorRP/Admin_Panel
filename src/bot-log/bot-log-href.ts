import type { Snowflake } from "discord-api-types/v10"

import type { BotLogFilters } from "./bot-log-filters"

const FILTER_NAMES = [
  "family",
  "action",
  "account",
  "channel",
  "text",
  "from",
  "to",
] as const

export function botLogHref({
  before = null,
  ...filters
}: BotLogFilters & { before?: Snowflake | null }) {
  const params = new URLSearchParams()
  for (const name of FILTER_NAMES) {
    const value = filters[name]
    if (value !== null) {
      params.set(name, value)
    }
  }
  if (before !== null) {
    params.set("before", before)
  }
  const query = params.toString()
  return query === "" ? "/bot-log" : `/bot-log?${query}`
}

export function hiddenFieldsOf({ family }: BotLogFilters) {
  return family === null ? [] : [{ name: "family", value: family }]
}
