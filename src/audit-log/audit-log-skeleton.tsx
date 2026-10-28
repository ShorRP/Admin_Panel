import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"

const CHANGE_WIDTHS = ["w-48", "w-40", "w-56", "w-44", "w-52"] as const

export function AuditLogSkeleton() {
  return (
    <div role="status" className="flex flex-col">
      <span className="sr-only">Chargement du journal d’audit…</span>
      {CHANGE_WIDTHS.map((width) => (
        <div
          key={width}
          className="flex items-center gap-4 border-b p-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:px-0 max-sm:py-2"
        >
          <Skeleton className="h-4 w-32 shrink-0 motion-reduce:animate-none" />
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
            <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
          </div>
          <Skeleton className={cn("h-4 motion-reduce:animate-none", width)} />
        </div>
      ))}
    </div>
  )
}
