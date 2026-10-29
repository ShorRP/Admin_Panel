import { MemberAvatar } from "@/ui/member-avatar"

export function StaffMemberIdentity({
  name,
  avatarUrl,
  opensModeration,
}: {
  name: string
  avatarUrl: string | null
  opensModeration: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <MemberAvatar name={name} avatarUrl={avatarUrl} />
      <div data-slot="staff-member-name" className="min-w-0">
        <div className="font-medium wrap-anywhere">{name}</div>
        <div className="text-xs text-muted-foreground">
          {opensModeration ? "Staff · Modération" : "Staff"}
        </div>
      </div>
    </div>
  )
}
