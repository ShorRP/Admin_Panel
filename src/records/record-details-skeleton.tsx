import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"

const VALUE_WIDTHS = ["w-32", "w-24", "w-40", "w-36", "w-28"] as const

const HISTORY_ENTRY_WIDTHS = ["w-48", "w-40"] as const

export function RecordDetailsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Chargement de la fiche…</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
        <Skeleton className="h-6 w-40 motion-reduce:animate-none" />
      </div>
      <div className="flex flex-col gap-4">
        {VALUE_WIDTHS.map((width) => (
          <div key={width} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24 motion-reduce:animate-none" />
            <Skeleton className={cn("h-4 motion-reduce:animate-none", width)} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-52 motion-reduce:animate-none" />
        {HISTORY_ENTRY_WIDTHS.map((width) => (
          <div key={width} className="flex flex-col gap-1.5">
            <Skeleton className={cn("h-4 motion-reduce:animate-none", width)} />
            <Skeleton className="h-3.5 w-56 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
