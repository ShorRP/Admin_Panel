import { MemberAvatar } from "@/ui/member-avatar"

export function StaffMemberIdentity({
  name,
  staffRole,
  avatarUrl,
}: {
  name: string
  staffRole: string
  avatarUrl: string | null
}) {
  return (
    <div
      title={`${name} · ${staffRole}`}
      className="flex min-w-0 items-center gap-2.5"
    >
      <MemberAvatar name={name} avatarUrl={avatarUrl} />
      <div
        data-slot="staff-member-name"
        className="min-w-0 font-medium wrap-anywhere"
      >
        {name}
      </div>
    </div>
  )
}
