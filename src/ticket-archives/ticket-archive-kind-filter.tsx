import { FilterPills } from "@/ui/filter-pills"
import { frenchNumber } from "@/ui/french-number"
import {
  REQUEST_KIND_KEYS,
  REQUEST_KINDS,
  type RequestKindKey,
} from "./request-kinds"
import {
  hasFilter,
  NO_FILTERS,
  type TicketArchiveFilters,
} from "./ticket-archive-filters"
import type { KindCounts } from "./ticket-archive-page"
import { ticketArchivesHref } from "./ticket-archives-href"

const KIND_LINKS: { key: RequestKindKey | null; label: string }[] = [
  { key: null, label: "Tout" },
  ...REQUEST_KIND_KEYS.map((key) => ({
    key,
    label: `${REQUEST_KINDS[key].emoji} ${REQUEST_KINDS[key].label}`,
  })),
]

export function TicketArchiveKindFilter({
  filters,
  counts,
}: {
  filters: TicketArchiveFilters
  counts: KindCounts | null
}) {
  return (
    <FilterPills
      label="Filtrer par type de demande"
      pills={KIND_LINKS.map(({ key, label }) => ({
        label,
        href: ticketArchivesHref({ ...filters, kind: key }, 1),
        current: key === filters.kind,
        badge:
          key !== null && counts !== null ? (
            <KindCount count={counts[key]} />
          ) : null,
      }))}
      resetHref={hasFilter(filters) ? ticketArchivesHref(NO_FILTERS, 1) : null}
    />
  )
}

function KindCount({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden className="font-mono text-[0.6875rem]">
        {frenchNumber(count)}
      </span>
      <span className="sr-only">
        {frenchNumber(count)} {count > 1 ? "archives" : "archive"}
      </span>
    </>
  )
}
