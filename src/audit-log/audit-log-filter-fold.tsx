import type { FilterChip } from "@/ui/filter-chips"
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
  const chips: FilterChip[] = AUDIT_LOG_FILTER_FIELDS.flatMap(
    ({ name, label }) => {
      const value = filters[name]
      return value === null
        ? []
        : [
            {
              name: label,
              value,
              href: auditLogHref({ ...filters, [name]: null }),
            },
          ]
    }
  )
  return (
    <FilterFold
      label="Auteur et compte"
      chips={chips}
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
