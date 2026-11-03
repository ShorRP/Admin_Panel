import { FilterChips, type FilterChip } from "@/ui/filter-chips"
import { FilterSheet } from "@/ui/filter-sheet"
import {
  AUDIT_LOG_FILTER_FIELDS,
  AuditLogFilterFields,
} from "./audit-log-filter-field"
import { NO_FILTER, type AuditLogFilters } from "./audit-log-filters"
import { auditLogHref } from "./audit-log-href"
import { FILTER_FOLD_CLASSES, SHEET_FIELD_CLASSES } from "./audit-log-layout"

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
    <div className={FILTER_FOLD_CLASSES}>
      <FilterSheet
        label="Auteur et compte"
        activeCount={chips.length}
        action="/audit-log"
        hiddenFields={
          filters.type === null ? [] : [{ name: "type", value: filters.type }]
        }
        resetHref={auditLogHref(NO_FILTER)}
        submitLabel="Filtrer"
      >
        <AuditLogFilterFields
          filters={filters}
          idPrefix="audit-log-sheet"
          className={SHEET_FIELD_CLASSES}
        />
      </FilterSheet>
      <FilterChips chips={chips} />
    </div>
  )
}
