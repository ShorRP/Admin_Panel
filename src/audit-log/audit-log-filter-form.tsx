import Form from "next/form"
import { ListFilter } from "lucide-react"

import { Button } from "@/ui/button"
import { AuditLogFilterFields } from "./audit-log-filter-field"
import type { AuditLogFilters } from "./audit-log-filters"
import { FILTER_FIELD_CLASSES, FILTER_FORM_CLASSES } from "./audit-log-layout"

export function AuditLogFilterForm({ filters }: { filters: AuditLogFilters }) {
  return (
    <Form action="/audit-log" prefetch={false} className={FILTER_FORM_CLASSES}>
      {filters.type !== null && (
        <input type="hidden" name="type" value={filters.type} />
      )}
      <AuditLogFilterFields
        filters={filters}
        idPrefix="audit-log"
        className={FILTER_FIELD_CLASSES}
      />
      <Button type="submit">
        <ListFilter aria-hidden data-icon="inline-start" />
        Filtrer
      </Button>
    </Form>
  )
}
