import { cn } from "cn"

import {
  FILTER_PILL_LIST_CLASSES,
  FILTER_PILL_SIZE_CLASSES,
  FILTER_PILLS_CLASSES,
  FILTERS_CLASSES,
} from "@/ui/filter-layout"
import { Skeleton } from "@/ui/skeleton"
import {
  SUPPORT_TICKET_ARCHIVES_CLASSES,
  SUPPORT_TICKET_ARCHIVES_LAYOUT_CLASSES,
  SUPPORT_TICKET_ENTRY_CLASSES,
  SUPPORT_TICKET_EVENTS_CLASSES,
} from "./support-ticket-archives-layout"
import { TicketArchiveFilterFormSkeleton } from "./ticket-archive-filter-form-skeleton"
import { TICKET_ARCHIVE_ENTRIES_CLASSES } from "./ticket-archive-layout"

const ENTRY_WIDTHS = ["w-44", "w-36", "w-52"] as const

const KIND_LINK_WIDTHS = ["w-13", "w-36", "w-40", "w-32", "w-36"] as const

export function SupportTicketArchivesSkeleton() {
  return (
    <div role="status" className={SUPPORT_TICKET_ARCHIVES_LAYOUT_CLASSES}>
      <span className="sr-only">Chargement des archives de tickets…</span>
      <div className={FILTERS_CLASSES}>
        <div className={FILTER_PILLS_CLASSES}>
          <div className={FILTER_PILL_LIST_CLASSES}>
            {KIND_LINK_WIDTHS.map((width, index) => (
              <Skeleton
                key={`${width}-${index}`}
                className={cn(
                  FILTER_PILL_SIZE_CLASSES,
                  "motion-reduce:animate-none",
                  width
                )}
              />
            ))}
          </div>
        </div>
        <TicketArchiveFilterFormSkeleton />
      </div>
      <div className={SUPPORT_TICKET_ARCHIVES_CLASSES}>
        <Skeleton className="h-3.5 w-28 motion-reduce:animate-none" />
        <div className={TICKET_ARCHIVE_ENTRIES_CLASSES}>
          {ENTRY_WIDTHS.map((width) => (
            <div key={width} className={SUPPORT_TICKET_ENTRY_CLASSES}>
              <Skeleton
                className={cn("h-5 motion-reduce:animate-none", width)}
              />
              <div className={SUPPORT_TICKET_EVENTS_CLASSES}>
                <Event />
                <Event />
              </div>
              <Skeleton className="h-4 w-64 max-w-full motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Event() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-16 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-32 motion-reduce:animate-none touch:h-11" />
      <Skeleton className="h-3.5 w-36 motion-reduce:animate-none" />
    </div>
  )
}
