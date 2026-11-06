import { FilterFormSkeleton } from "@/ui/filter-form-skeleton"
import { FILTER_FIELD_CLASSES } from "@/ui/filter-layout"

const LABEL_WIDTHS = ["w-12", "w-14", "w-10", "w-5", "w-6"] as const

export function AuditLogFilterFormSkeleton() {
  return (
    <FilterFormSkeleton
      labelWidths={LABEL_WIDTHS}
      fieldClassName={FILTER_FIELD_CLASSES}
    />
  )
}
