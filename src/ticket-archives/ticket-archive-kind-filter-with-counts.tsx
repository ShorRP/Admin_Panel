import type { TicketArchiveFilters } from "./ticket-archive-filters"
import { TicketArchiveKindFilter } from "./ticket-archive-kind-filter"
import type { KindCounts } from "./ticket-archive-page"

export async function TicketArchiveKindFilterWithCounts({
  filters,
  counts,
}: {
  filters: TicketArchiveFilters
  counts: Promise<KindCounts | null>
}) {
  return <TicketArchiveKindFilter filters={filters} counts={await counts} />
}
