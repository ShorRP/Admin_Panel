import { cn } from "cn"

import { OrnamentRule } from "@/ui/ornament-rule"
import { Skeleton } from "@/ui/skeleton"
import { RecordColumns } from "./record-columns"

const DETAIL_VALUE_WIDTHS = ["w-32", "w-24", "w-40", "w-36", "w-28"] as const

const HISTORY_ENTRY_WIDTHS = ["w-48", "w-40"] as const

export function RecordDetailsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Chargement de la fiche…</span>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-5">
          <Skeleton className="size-17 shrink-0 rounded-full motion-reduce:animate-none" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.25">
            <Skeleton className="h-10 w-56 max-w-full motion-reduce:animate-none" />
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-6 w-36 rounded-full motion-reduce:animate-none" />
              <Skeleton className="h-3.5 w-24 motion-reduce:animate-none" />
            </div>
          </div>
        </div>
        <OrnamentRule leadingLine />
      </div>
      <RecordColumns
        twoColumns
        details={
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
              <Skeleton className="h-6 w-20 motion-reduce:animate-none" />
              <Skeleton className="h-2.5 w-24 motion-reduce:animate-none" />
            </div>
            <div className="flex flex-col px-5 pt-1 pb-1.5">
              {DETAIL_VALUE_WIDTHS.map((width) => (
                <div
                  key={width}
                  className="flex gap-4 border-t py-3.5 first:border-t-transparent"
                >
                  <Skeleton className="h-3.5 w-24 shrink-0 motion-reduce:animate-none sm:w-36" />
                  <Skeleton
                    className={cn("h-3.5 motion-reduce:animate-none", width)}
                  />
                </div>
              ))}
            </div>
          </div>
        }
        history={
          <div className="flex flex-col gap-4.5">
            <Skeleton className="h-7 w-64 max-w-full motion-reduce:animate-none" />
            <div>
              {HISTORY_ENTRY_WIDTHS.map((width) => (
                <div
                  key={width}
                  className="group/entry relative flex flex-col gap-2 pb-6 pl-7.5"
                >
                  <span className="absolute top-4 bottom-0 left-1 w-px bg-border group-last/entry:hidden" />
                  <Skeleton className="absolute top-1.25 left-0 size-2.25 rotate-45 rounded-none motion-reduce:animate-none" />
                  <Skeleton
                    className={cn("h-4 motion-reduce:animate-none", width)}
                  />
                  <Skeleton className="h-3.5 w-56 max-w-full motion-reduce:animate-none" />
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  )
}
