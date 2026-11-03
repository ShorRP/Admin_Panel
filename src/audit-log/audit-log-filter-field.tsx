import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import type { AuditLogFilters } from "./audit-log-filters"

export const AUDIT_LOG_FILTER_FIELDS = [
  { name: "author", label: "Auteur" },
  { name: "account", label: "Compte" },
] as const

export function AuditLogFilterFields({
  filters,
  idPrefix,
  className,
}: {
  filters: AuditLogFilters
  idPrefix: string
  className: string
}) {
  return AUDIT_LOG_FILTER_FIELDS.map(({ name, label }) => (
    <div key={name} className={className}>
      <Label htmlFor={`${idPrefix}-${name}`}>{label}</Label>
      <Input
        id={`${idPrefix}-${name}`}
        name={name}
        defaultValue={filters[name] ?? ""}
        placeholder="Nom, ID ou mention"
        autoComplete="off"
      />
    </div>
  ))
}
