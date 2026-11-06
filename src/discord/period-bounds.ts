import type { Snowflake } from "discord-api-types/v10"

import { compareIds } from "./compare-ids"
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

export function searchBounds(
  period: { start: Date | null; end: Date | null },
  before: Snowflake | null
): PeriodBounds | null {
  if (
    period.start !== null &&
    period.end !== null &&
    period.start >= period.end
  ) {
    return null
  }
  const { minId, maxId: periodEnd } = periodBounds(period)
  const maxId =
    before === null ||
    (periodEnd !== undefined && compareIds(periodEnd, before) <= 0)
      ? periodEnd
      : before
  if (
    minId !== undefined &&
    maxId !== undefined &&
    compareIds(minId, maxId) >= 0
  ) {
    return null
  }
  return {
    ...(minId === undefined ? {} : { minId }),
    ...(maxId === undefined ? {} : { maxId }),
  }
}
