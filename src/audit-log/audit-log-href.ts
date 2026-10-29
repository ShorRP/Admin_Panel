import type { Snowflake } from "discord-api-types/v10"

import type { ChangeType } from "./read-audit-log"

export function auditLogHref({
  type,
  before = null,
}: {
  type: ChangeType | null
  before?: Snowflake | null
}) {
  const params = new URLSearchParams()
  if (type !== null) {
    params.set("type", type)
  }
  if (before !== null) {
    params.set("before", before)
  }
  const query = params.toString()
  return query === "" ? "/audit-log" : `/audit-log?${query}`
}
