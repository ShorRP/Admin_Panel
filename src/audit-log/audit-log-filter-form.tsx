import { FilterForm } from "@/ui/filter-form"
import { AuditLogFilterFields } from "./audit-log-filter-field"
import { hiddenFieldsOf, type AuditLogFilters } from "./audit-log-filters"
import { FILTER_FIELD_CLASSES } from "./audit-log-layout"

export function AuditLogFilterForm({ filters }: { filters: AuditLogFilters }) {
  return (
    <FilterForm
      action="/audit-log"
      hiddenFields={hiddenFieldsOf(filters)}
      submitLabel="Filtrer"
    >
      <AuditLogFilterFields
        filters={filters}
        idPrefix="audit-log"
        className={FILTER_FIELD_CLASSES}
      />
    </FilterForm>
  )
}
