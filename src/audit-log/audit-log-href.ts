import type { Snowflake } from "discord-api-types/v10"

import type { AuditLogFilters } from "./audit-log-filters"

const FILTER_NAMES = [
  "type",
  "author",
  "account",
  "text",
  "from",
  "to",
] as const

export function auditLogHref({
  before = null,
  ...filters
}: AuditLogFilters & { before?: Snowflake | null }) {
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
  return query === "" ? "/audit-log" : `/audit-log?${query}`
}
