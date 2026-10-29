import { Skeleton } from "@/ui/skeleton"

export function AccountSearchFormSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">Chargement de la recherche…</span>
      <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
      <div className="flex gap-2">
        <Skeleton className="h-11 min-w-0 flex-1 motion-reduce:animate-none" />
        <Skeleton className="h-11 w-32 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
