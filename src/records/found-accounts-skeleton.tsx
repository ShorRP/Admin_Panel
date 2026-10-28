import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"

const NAME_WIDTHS = ["w-32", "w-40", "w-28"] as const

export function FoundAccountsSkeleton() {
  return (
    <div role="status" className="flex flex-col border-t">
      <span className="sr-only">Chargement des comptes…</span>
      {NAME_WIDTHS.map((width) => (
        <div key={width} className="flex items-center gap-3 border-b px-2 py-2">
          <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className={cn("h-4 motion-reduce:animate-none", width)} />
            <Skeleton className="h-3.5 w-20 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}
