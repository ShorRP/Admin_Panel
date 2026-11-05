import type { Snowflake } from "discord-api-types/v10"

import { firstSnowflakeAt } from "@/discord/snowflake-date"
import { parisDayAfter, parisDayStart } from "@/ui/paris-day-bounds"
import type { TicketArchiveFilters } from "./ticket-archive-filters"

export type PeriodBounds = { minId?: Snowflake; maxId?: Snowflake }

export function periodBounds({
  from,
  to,
}: Pick<TicketArchiveFilters, "from" | "to">): PeriodBounds {
  const first = from === null ? null : firstSnowflakeAt(parisDayStart(from))
  const end = to === null ? null : firstSnowflakeAt(parisDayAfter(to))
  return {
    ...(first === null || BigInt(first) === BigInt(0)
      ? {}
      : { minId: (BigInt(first) - BigInt(1)).toString() }),
    ...(end === null ? {} : { maxId: end }),
  }
}
