import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import {
  FILTER_FIELD_CLASSES,
  FILTER_FORM_CLASSES,
} from "./ticket-archive-filter-layout"

const LABELS = [
  { field: "opener", width: "w-16" },
  { field: "closer", width: "w-14" },
  { field: "reason", width: "w-12" },
  { field: "from", width: "w-8" },
  { field: "to", width: "w-8" },
  { field: "on", width: "w-20" },
  { field: "sort", width: "w-12" },
] as const

export function TicketArchiveFilterFormSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-full motion-reduce:animate-none md:hidden touch:h-11" />
      <div className={FILTER_FORM_CLASSES}>
        {LABELS.map(({ field, width }) => (
          <div key={field} className={FILTER_FIELD_CLASSES}>
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
