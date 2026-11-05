import { cn } from "cn"

import {
  FILTER_CONTROL_HEIGHT_CLASSES,
  FILTER_FORM_CLASSES,
} from "@/ui/filter-layout"
import { Skeleton } from "@/ui/skeleton"
import { FILTER_FIELD_CLASSES } from "./ticket-archive-filter-layout"

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
      <Skeleton
        className={cn(
          FILTER_CONTROL_HEIGHT_CLASSES,
          "w-full motion-reduce:animate-none md:hidden"
        )}
      />
      <div className={FILTER_FORM_CLASSES}>
        {LABELS.map(({ field, width }) => (
          <div key={field} className={FILTER_FIELD_CLASSES}>
            <Skeleton
              className={cn("h-3.5 motion-reduce:animate-none", width)}
            />
            <Skeleton
              className={cn(
                FILTER_CONTROL_HEIGHT_CLASSES,
                "w-full motion-reduce:animate-none"
              )}
            />
          </div>
        ))}
        <Skeleton
          className={cn(
            FILTER_CONTROL_HEIGHT_CLASSES,
            "w-22 motion-reduce:animate-none"
          )}
        />
      </div>
    </>
  )
}
