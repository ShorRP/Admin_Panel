import { MemberAvatar } from "@/ui/member-avatar"
import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
import { PageHeading } from "@/ui/page-heading"
import type { AccountRecord } from "./read-record"
import { StandingBadge } from "./standing-badge"

export function RecordHeader({ record }: { record: AccountRecord | null }) {
  return (
    <div className="flex flex-col gap-6">
      {record === null ? (
        <PageHeader title="Fiche">Aucun compte Discord n’a cet ID.</PageHeader>
      ) : (
        <div className="flex items-center gap-5">
          <MemberAvatar
            name={record.name}
            avatarUrl={record.avatarUrl}
            className="size-17 shadow-[0_0_0_4px_var(--color-background),0_0_0_5px_var(--color-border)] *:data-[slot=avatar-fallback]:font-heading *:data-[slot=avatar-fallback]:text-[1.75rem]"
          />
          <div className="flex min-w-0 flex-col gap-2.25">
            <PageHeading className="wrap-anywhere">{record.name}</PageHeading>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <StandingBadge standing={record.standing} />
              <span className="font-mono text-[0.78125rem] wrap-anywhere">{`@${record.username}`}</span>
            </div>
          </div>
        </div>
      )}
      <OrnamentRule leadingLine />
    </div>
  )
}
