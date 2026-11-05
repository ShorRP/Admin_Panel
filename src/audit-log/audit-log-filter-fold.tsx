import { filterChipsOf } from "@/ui/filter-fields"
import { FilterFold } from "@/ui/filter-fold"
import { SHEET_FIELD_CLASSES } from "@/ui/filter-layout"
import {
  AUDIT_LOG_FILTER_FIELDS,
  AuditLogFilterFields,
} from "./audit-log-filter-field"
import {
  hiddenFieldsOf,
  NO_FILTER,
  type AuditLogFilters,
} from "./audit-log-filters"
import { auditLogHref } from "./audit-log-href"

export function AuditLogFilterFold({ filters }: { filters: AuditLogFilters }) {
  return (
    <FilterFold
      label="Filtres"
      chips={filterChipsOf(AUDIT_LOG_FILTER_FIELDS, filters, (name) =>
        auditLogHref({ ...filters, [name]: null })
      )}
      action="/audit-log"
      hiddenFields={hiddenFieldsOf(filters)}
      resetHref={auditLogHref(NO_FILTER)}
      submitLabel="Filtrer"
    >
      <AuditLogFilterFields
        filters={filters}
        idPrefix="audit-log-sheet"
        className={SHEET_FIELD_CLASSES}
      />
    </FilterFold>
  )
}
