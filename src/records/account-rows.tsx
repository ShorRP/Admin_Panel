import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { MemberAvatar } from "@/ui/member-avatar"
import { isTimedOut } from "./account-standing"
import type { FoundAccount } from "./found-account"
import { recordHref } from "./record-href"
import { RoleBadge } from "./role-badge"
import { StandingBadge } from "./standing-badge"

export function AccountRows({
  accounts,
  labelledBy,
}: {
  accounts: FoundAccount[]
  labelledBy: string
}) {
  return (
    <ul
      aria-labelledby={labelledBy}
      className="divide-y overflow-hidden rounded-xl border bg-card"
    >
      {accounts.map(
        ({ id, name, username, avatarUrl, standing, highestRole }) => (
          <li key={id}>
            <Link
              href={recordHref(id)}
              prefetch={false}
              className="flex items-center gap-3.5 px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <MemberAvatar name={name} avatarUrl={avatarUrl} />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-x-3.5 gap-y-1.5 sm:flex-row sm:items-center">
                <div className="flex w-full min-w-0 flex-1 flex-col gap-px">
                  <span className="font-medium wrap-anywhere">{name}</span>
                  <span className="font-mono text-xs wrap-anywhere text-muted-foreground">{`@${username}`}</span>
                </div>
                <div className="flex max-w-full min-w-0 flex-wrap gap-1.5 sm:justify-end">
                  {highestRole !== null && <RoleBadge role={highestRole} />}
                  {(highestRole === null || isTimedOut(standing)) && (
                    <StandingBadge standing={standing} />
                  )}
                </div>
              </div>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        )
      )}
    </ul>
  )
}
