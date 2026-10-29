import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"

const NAME_WIDTHS = ["w-32", "w-40", "w-28"] as const

export function FoundAccountsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2.5">
      <span className="sr-only">Chargement des comptes…</span>
      <Skeleton className="h-3.5 w-52 motion-reduce:animate-none" />
      <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
        {NAME_WIDTHS.map((width) => (
          <div key={width} className="flex items-center gap-3.5 px-4 py-3">
            <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-x-3.5 gap-y-1.5 sm:flex-row sm:items-center">
              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton
                  className={cn("h-4 motion-reduce:animate-none", width)}
                />
                <Skeleton className="h-3 w-20 motion-reduce:animate-none" />
              </div>
              <Skeleton className="h-6 w-36 rounded-full motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
