import type { Snowflake } from "discord-api-types/v10"

import type { AuditLogFilters } from "./audit-log-filters"

export function auditLogHref({
  type,
  author,
  account,
  before = null,
}: AuditLogFilters & { before?: Snowflake | null }) {
  const params = new URLSearchParams()
  if (type !== null) {
    params.set("type", type)
  }
  if (author !== null) {
    params.set("author", author)
  }
  if (account !== null) {
    params.set("account", account)
  }
  if (before !== null) {
    params.set("before", before)
  }
  const query = params.toString()
  return query === "" ? "/audit-log" : `/audit-log?${query}`
}
