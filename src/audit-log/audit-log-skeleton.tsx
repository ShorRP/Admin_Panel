import { LogSkeleton } from "@/ui/log-skeleton"
import { AuditLogFilterFormSkeleton } from "./audit-log-filter-form-skeleton"
import { CHANGE_TYPES, type ChangeType } from "./change-type"

const PILL_WIDTHS = {
  all: "w-13",
  "blocked-words": "w-29",
  links: "w-15",
  timeouts: "w-24",
  kicks: "w-24.5",
  bans: "w-29.5",
} as const satisfies Record<ChangeType | "all", string>

const TYPE_LINK_WIDTHS = ["all" as const, ...CHANGE_TYPES].map(
  (type) => PILL_WIDTHS[type]
)

export function AuditLogSkeleton() {
  return (
    <LogSkeleton
      loading="Chargement du journal d’audit…"
      pillWidths={TYPE_LINK_WIDTHS}
      form={<AuditLogFilterFormSkeleton />}
    />
  )
}
