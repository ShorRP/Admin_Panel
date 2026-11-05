import Form from "next/form"
import { ListFilter } from "lucide-react"

import { Button } from "@/ui/button"
import { TicketArchiveFilterFields } from "./ticket-archive-filter-fields"
import {
  FILTER_FIELD_CLASSES,
  FILTER_FORM_CLASSES,
} from "./ticket-archive-filter-layout"
import type { TicketArchiveFilters } from "./ticket-archive-filters"

export function TicketArchiveFilterForm({
  filters,
}: {
  filters: TicketArchiveFilters
}) {
  return (
    <Form
      action="/support-tickets"
      prefetch={false}
      className={FILTER_FORM_CLASSES}
    >
      {filters.kind !== null && (
        <input type="hidden" name="kind" value={filters.kind} />
      )}
      <TicketArchiveFilterFields
        filters={filters}
        idPrefix="archives"
        className={FILTER_FIELD_CLASSES}
      />
      <Button type="submit">
        <ListFilter aria-hidden data-icon="inline-start" />
        Filtrer
      </Button>
    </Form>
  )
}
