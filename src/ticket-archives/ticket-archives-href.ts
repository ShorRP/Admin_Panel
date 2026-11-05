import type { TicketArchiveFilters } from "./ticket-archive-filters"

const FILTER_NAMES = [
  "kind",
  "opener",
  "closer",
  "reason",
  "from",
  "to",
  "on",
  "sort",
] as const

export function ticketArchivesHref(
  filters: TicketArchiveFilters,
  page: number
) {
  const params = new URLSearchParams()
  for (const name of FILTER_NAMES) {
    const value = filters[name]
    if (value !== null) {
      params.set(name, value)
    }
  }
  if (page > 1) {
    params.set("page", String(page))
  }
  const query = params.toString()
  return query === "" ? "/support-tickets" : `/support-tickets?${query}`
}
