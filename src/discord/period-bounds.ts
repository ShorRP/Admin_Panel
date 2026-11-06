import type { Snowflake } from "discord-api-types/v10"

import { firstSnowflakeAt } from "./snowflake-date"

export type PeriodBounds = { minId?: Snowflake; maxId?: Snowflake }

export function periodBounds({
  start,
  end,
}: {
  start: Date | null
  end: Date | null
}): PeriodBounds {
  const first = start === null ? null : firstSnowflakeAt(start)
  const after = end === null ? null : firstSnowflakeAt(end)
  return {
    ...(first === null || BigInt(first) === BigInt(0)
      ? {}
      : { minId: (BigInt(first) - BigInt(1)).toString() }),
    ...(after === null ? {} : { maxId: after }),
  }
}
