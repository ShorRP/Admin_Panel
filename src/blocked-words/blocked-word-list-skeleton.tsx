import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"

const WORD_WIDTHS = ["w-28", "w-40", "w-32"] as const

export function BlockedWordListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">Chargement des mots interdits…</span>
      <Skeleton className="my-1 h-4 w-56 motion-reduce:animate-none" />
      <div className="flex flex-col gap-1">
        {WORD_WIDTHS.map((width) => (
          <div key={width} className="flex items-center justify-between gap-2">
            <Skeleton className={cn("h-4 motion-reduce:animate-none", width)} />
            <Skeleton className="h-8 w-24 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
