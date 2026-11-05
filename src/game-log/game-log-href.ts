import type { Snowflake } from "discord-api-types/v10"

import type { GameLogFilters } from "./game-log-filters"

export function gameLogHref({
  text,
  before = null,
}: GameLogFilters & { before?: Snowflake | null }) {
  const params = new URLSearchParams()
  if (text !== null) {
    params.set("text", text)
  }
  if (before !== null) {
    params.set("before", before)
  }
  const query = params.toString()
  return query === "" ? "/game-log" : `/game-log?${query}`
}
