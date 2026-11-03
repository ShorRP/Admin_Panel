import { Skeleton } from "@/ui/skeleton"

export function AddBlockedWordFormSkeleton() {
  return (
    <div
      role="status"
      className="flex flex-col rounded-xl border bg-card px-5 py-4.5"
    >
      <span className="sr-only">Chargement du formulaire…</span>
      <Skeleton className="h-4.5 w-52 motion-reduce:animate-none" />
      <Skeleton className="mt-2.5 h-9.5 w-full motion-reduce:animate-none touch:h-11" />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-3 sm:gap-y-2.5">
        <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-64 sm:flex-1">
          <Skeleton className="h-4.5 w-12 motion-reduce:animate-none" />
          <Skeleton className="h-9.5 w-full motion-reduce:animate-none touch:h-11" />
        </div>
        <Skeleton className="h-9.5 w-full motion-reduce:animate-none sm:w-24 touch:h-11" />
      </div>
    </div>
  )
}
