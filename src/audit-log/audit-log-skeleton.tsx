import { LogSkeleton } from "@/ui/log-skeleton"
import { AuditLogFilterFormSkeleton } from "./audit-log-filter-form-skeleton"

const TYPE_LINK_WIDTHS = ["w-13", "w-29", "w-24", "w-24.5", "w-29.5"] as const

export function AuditLogSkeleton() {
  return (
    <LogSkeleton
      loading="Chargement du journal d’audit…"
      pillWidths={TYPE_LINK_WIDTHS}
      form={<AuditLogFilterFormSkeleton />}
    />
  )
}
