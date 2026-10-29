import { Skeleton } from "@/ui/skeleton"

export function BlockedWordCapacitySkeleton() {
  return (
    <div aria-hidden className="flex min-w-52.5 flex-col gap-2">
      <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
      <Skeleton className="h-7.5 w-28 motion-reduce:animate-none" />
      <Skeleton className="h-0.75 w-full rounded-xs motion-reduce:animate-none" />
    </div>
  )
}
