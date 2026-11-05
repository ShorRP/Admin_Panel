import { FilterFormSkeleton } from "@/ui/filter-form-skeleton"
import { FILTER_FIELD_CLASSES } from "./audit-log-layout"

const LABEL_WIDTHS = ["w-12", "w-14"] as const

export function AuditLogFilterFormSkeleton() {
  return (
    <FilterFormSkeleton
      labelWidths={LABEL_WIDTHS}
      fieldClassName={FILTER_FIELD_CLASSES}
    />
  )
}
