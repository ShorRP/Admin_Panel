import { FilterPills } from "@/ui/filter-pills"
import { TextLink } from "@/ui/text-link"
import { hasFilter, NO_FILTER, type AuditLogFilters } from "./audit-log-filters"
import { auditLogHref } from "./audit-log-href"
import { CHANGE_TYPES, type ChangeType } from "./change-type"

const LABELS: Record<ChangeType, string> = {
  "blocked-words": "Mots interdits",
  timeouts: "Exclusions",
  kicks: "Expulsions",
  bans: "Bannissements",
}

const TYPE_LINKS = [
  { type: null, label: "Tout" },
  ...CHANGE_TYPES.map((type) => ({ type, label: LABELS[type] })),
]

export function AuditLogTypeFilter({ filters }: { filters: AuditLogFilters }) {
  return (
    <FilterPills
      label="Filtrer par type"
      pills={TYPE_LINKS.map(({ type, label }) => ({
        label,
        href: auditLogHref({ ...filters, type }),
        current: type === filters.type,
      }))}
      resetHref={hasFilter(filters) ? auditLogHref(NO_FILTER) : null}
    />
  )
}

export function ResetLink() {
  return (
    <TextLink href={auditLogHref(NO_FILTER)} className="text-[0.8125rem]">
      Réinitialiser
    </TextLink>
  )
}
