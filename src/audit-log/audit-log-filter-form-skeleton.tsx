import { cn } from "cn"

import { FILTER_FORM_CLASSES } from "@/ui/filter-layout"
import { Skeleton } from "@/ui/skeleton"
import { FILTER_FIELD_CLASSES } from "./audit-log-layout"

const LABEL_WIDTHS = ["w-12", "w-14"] as const

export function AuditLogFilterFormSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-full motion-reduce:animate-none md:hidden touch:h-11" />
      <div className={FILTER_FORM_CLASSES}>
        {LABEL_WIDTHS.map((width) => (
          <div key={width} className={FILTER_FIELD_CLASSES}>
            <Skeleton
              className={cn("h-3.5 motion-reduce:animate-none", width)}
            />
            <Skeleton className="h-8 w-full motion-reduce:animate-none touch:h-11" />
          </div>
        ))}
        <Skeleton className="h-8 w-22 motion-reduce:animate-none touch:h-11" />
      </div>
    </>
  )
}
