import type { Snowflake } from "discord-api-types/v10"

import type { GameLogFilters } from "./game-log-filters"

const FILTER_NAMES = [
  "category",
  "action",
  "character",
  "account",
  "target",
  "cell",
  "plugin",
  "reason",
  "text",
  "from",
  "to",
] as const

export function gameLogHref({
  before = null,
  ...filters
}: GameLogFilters & { before?: Snowflake | null }) {
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
  return query === "" ? "/game-log" : `/game-log?${query}`
}

export function hiddenFieldsOf({ category }: GameLogFilters) {
  return category === null ? [] : [{ name: "category", value: category }]
}
