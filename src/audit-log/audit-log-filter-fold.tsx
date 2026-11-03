import { AuditLogFilterField } from "./audit-log-filter-field"
import type { AuditLogFilters } from "./audit-log-filters"
import { auditLogHref } from "./audit-log-href"
import { FILTER_FOLD_CLASSES, SHEET_FIELD_CLASSES } from "./audit-log-layout"
import { FilterChips, type FilterChip } from "./filter-chips"
import { FilterSheet } from "./filter-sheet"

const NO_FILTER: AuditLogFilters = { type: null, author: null, account: null }

export function AuditLogFilterFold({ filters }: { filters: AuditLogFilters }) {
  const chips: FilterChip[] = []
  if (filters.author !== null) {
    chips.push({
      name: "Auteur",
      value: filters.author,
      href: auditLogHref({ ...filters, author: null }),
    })
  }
  if (filters.account !== null) {
    chips.push({
      name: "Compte",
      value: filters.account,
      href: auditLogHref({ ...filters, account: null }),
    })
  }
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
        <AuditLogSheetFields filters={filters} />
      </FilterSheet>
      <FilterChips chips={chips} />
    </div>
  )
}

export function AuditLogSheetFields({
  filters: { author, account },
}: {
  filters: AuditLogFilters
}) {
  return (
    <>
      <AuditLogFilterField
        id="audit-log-sheet-author"
        name="author"
        label="Auteur"
        value={author}
        className={SHEET_FIELD_CLASSES}
      />
      <AuditLogFilterField
        id="audit-log-sheet-account"
        name="account"
        label="Compte"
        value={account}
        className={SHEET_FIELD_CLASSES}
      />
    </>
  )
}
