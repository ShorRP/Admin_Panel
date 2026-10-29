import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import { WORD_GRID_CLASSES, WORD_TILE_CLASSES } from "./word-tiles"

const WORD_WIDTHS = ["w-16", "w-24", "w-20", "w-28", "w-14", "w-32"] as const

export function BlockedWordListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3.5">
      <span className="sr-only">Chargement des mots interdits…</span>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-6.5 w-24 motion-reduce:animate-none" />
        <Skeleton className="h-3.5 w-28 motion-reduce:animate-none" />
      </div>
      <div className={WORD_GRID_CLASSES}>
        {WORD_WIDTHS.map((width) => (
          <div key={width} className={cn("pr-2.5", WORD_TILE_CLASSES)}>
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
