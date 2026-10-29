import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"

const WORD_WIDTHS = ["w-16", "w-24", "w-20", "w-28", "w-14", "w-32"] as const

export function BlockedWordListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3.5">
      <span className="sr-only">Chargement des mots interdits…</span>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-6.5 w-24 motion-reduce:animate-none" />
        <Skeleton className="h-3.5 w-28 motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2">
        {WORD_WIDTHS.map((width) => (
          <div
            key={width}
            className="flex h-10 items-center gap-1.5 rounded-lg border bg-card pr-2.5 pl-3"
          >
            <Skeleton
              className={cn("h-3.5 motion-reduce:animate-none", width)}
            />
            <Skeleton className="ml-auto size-4 shrink-0 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
