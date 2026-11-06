import type { Snowflake } from "discord-api-types/v10"

import { parisDayAfter, parisDayStart } from "@/ui/paris-day-bounds"
import { firstSnowflakeAt } from "./snowflake-date"

export type PeriodBounds = { minId?: Snowflake; maxId?: Snowflake }

export function periodBounds({
  from,
  to,
}: {
  from: string | null
  to: string | null
}): PeriodBounds {
  const first = from === null ? null : firstSnowflakeAt(parisDayStart(from))
  const end = to === null ? null : firstSnowflakeAt(parisDayAfter(to))
  return {
    ...(first === null || BigInt(first) === BigInt(0)
      ? {}
      : { minId: (BigInt(first) - BigInt(1)).toString() }),
    ...(end === null ? {} : { maxId: end }),
  }
}
