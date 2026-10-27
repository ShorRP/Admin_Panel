import { Skeleton } from "@/ui/skeleton"

export function StaffMemberNameSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Chargement de ton nom…</span>
      <Skeleton className="my-1 h-4 w-24 motion-reduce:animate-none" />
    </div>
  )
}
