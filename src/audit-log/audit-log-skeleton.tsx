import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import {
  CHANGE_ICON_TILE_CLASSES,
  CHANGE_LIST_CLASSES,
  CHANGE_ROW_CLASSES,
  CHANGE_STAFF_MEMBER_CLASSES,
  CHANGE_TIME_CLASSES,
  CHANGE_WHAT_CLASSES,
  DAY_HEADER_CLASSES,
} from "./audit-log-rows"

const DAYS = [
  {
    headingWidth: "w-44",
    changes: [
      { titleWidth: "w-44", sanction: false },
      { titleWidth: "w-64", sanction: true },
    ],
  },
  {
    headingWidth: "w-40",
    changes: [
      { titleWidth: "w-36", sanction: true },
      { titleWidth: "w-52", sanction: false },
      { titleWidth: "w-40", sanction: false },
    ],
  },
] as const

export function AuditLogSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-7">
      <span className="sr-only">Chargement du journal d’audit…</span>
      {DAYS.map(({ headingWidth, changes }) => (
        <div key={headingWidth} className="flex flex-col gap-2.5">
          <div className={DAY_HEADER_CLASSES}>
            <Skeleton
              className={cn("h-5.5 motion-reduce:animate-none", headingWidth)}
            />
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className={CHANGE_LIST_CLASSES}>
            {changes.map(({ titleWidth, sanction }) => (
              <div key={titleWidth} className={CHANGE_ROW_CLASSES}>
                <div className={CHANGE_TIME_CLASSES}>
                  <Skeleton className="h-3.5 w-10 motion-reduce:animate-none" />
                </div>
                <Skeleton
                  className={cn(
                    CHANGE_ICON_TILE_CLASSES,
                    "motion-reduce:animate-none"
                  )}
                />
                <div className={CHANGE_WHAT_CLASSES}>
                  <Skeleton
                    className={cn(
                      "h-4 max-w-full motion-reduce:animate-none",
                      titleWidth
                    )}
                  />
                  {sanction && (
                    <Skeleton className="mt-1 h-3.5 w-full max-w-80 motion-reduce:animate-none" />
                  )}
                </div>
                <div className={CHANGE_STAFF_MEMBER_CLASSES}>
                  <Skeleton className="size-6 shrink-0 rounded-full motion-reduce:animate-none" />
                  <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
