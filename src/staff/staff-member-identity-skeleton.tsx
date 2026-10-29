import { Skeleton } from "@/ui/skeleton"

export function StaffMemberIdentitySkeleton() {
  return (
    <div role="status" className="flex min-w-0 items-center gap-2.5">
      <span className="sr-only">Chargement de ton nom…</span>
      <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
      <div data-slot="staff-member-name">
        <Skeleton className="my-0.5 h-4 w-24 motion-reduce:animate-none" />
        <Skeleton className="my-0.5 h-3 w-16 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
