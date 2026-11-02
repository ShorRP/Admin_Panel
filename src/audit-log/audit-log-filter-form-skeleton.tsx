import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import { FILTER_FIELD_CLASSES, FILTER_FORM_CLASSES } from "./audit-log-layout"

const LABEL_WIDTHS = ["w-12", "w-14"] as const

export function AuditLogFilterFormSkeleton() {
  return (
    <div className={FILTER_FORM_CLASSES}>
      {LABEL_WIDTHS.map((width) => (
        <div key={width} className={FILTER_FIELD_CLASSES}>
          <Skeleton className={cn("h-3.5 motion-reduce:animate-none", width)} />
          <Skeleton className="h-8 w-full motion-reduce:animate-none" />
        </div>
      ))}
      <Skeleton className="h-8 w-22 motion-reduce:animate-none" />
    </div>
  )
}
