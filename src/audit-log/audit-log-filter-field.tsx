import {
  FilterFields,
  PERIOD_FIELDS,
  searchTextField,
  type FilterFieldSpec,
} from "@/ui/filter-fields"
import type { AuditLogFilters } from "./audit-log-filters"

export type AuditLogFieldName = Exclude<keyof AuditLogFilters, "type">

export const AUDIT_LOG_FILTER_FIELDS: readonly FilterFieldSpec<AuditLogFieldName>[] =
  [
    {
      name: "author",
      label: "Auteur",
      type: "text",
      placeholder: "Nom, ID ou mention",
    },
    {
      name: "account",
      label: "Compte",
      type: "text",
      placeholder: "Nom, ID ou mention",
    },
    searchTextField("Mot ou motif"),
    ...PERIOD_FIELDS,
  ]

export function AuditLogFilterFields({
  filters,
  idPrefix,
  className,
}: {
  filters: AuditLogFilters
  idPrefix: string
  className: string
}) {
  return (
    <FilterFields
      fields={AUDIT_LOG_FILTER_FIELDS}
      values={filters}
      idPrefix={idPrefix}
      className={className}
    />
  )
}
