import { FilterChips } from "@/ui/filter-chips"
import { FILTER_FOLD_CLASSES, SHEET_FIELD_CLASSES } from "@/ui/filter-layout"
import { FilterSheet } from "@/ui/filter-sheet"
import {
  ticketArchiveChipsOf,
  TicketArchiveFilterFields,
} from "./ticket-archive-filter-fields"
import { NO_FILTERS, type TicketArchiveFilters } from "./ticket-archive-filters"
import { ticketArchivesHref } from "./ticket-archives-href"

export function TicketArchiveFilterFold({
  filters,
}: {
  filters: TicketArchiveFilters
}) {
  const chips = ticketArchiveChipsOf(filters)
  return (
    <div className={FILTER_FOLD_CLASSES}>
      <FilterSheet
        label="Filtres"
        activeCount={chips.length}
        action="/support-tickets"
        hiddenFields={
          filters.kind === null ? [] : [{ name: "kind", value: filters.kind }]
        }
        resetHref={ticketArchivesHref(NO_FILTERS, 1)}
        submitLabel="Filtrer"
      >
        <TicketArchiveFilterFields
          filters={filters}
          idPrefix="archives-sheet"
          className={SHEET_FIELD_CLASSES}
        />
      </FilterSheet>
      <FilterChips chips={chips} />
    </div>
  )
}
