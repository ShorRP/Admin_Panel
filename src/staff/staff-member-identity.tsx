import { MemberAvatar } from "@/ui/member-avatar"

export function StaffMemberIdentity({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl: string | null
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatar name={name} avatarUrl={avatarUrl} />
      <div data-slot="staff-member-name" className="wrap-anywhere">
        {name}
      </div>
    </div>
  )
}
