import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { MemberAvatar } from "@/ui/member-avatar"
import { Overline } from "@/ui/overline"
import { isTimedOut } from "./account-standing"
import type { AccountSearch } from "./search-accounts"
import { StandingBadge } from "./standing-badge"

const COUNT_ID = "found-accounts-count"

export function FoundAccounts({ search }: { search: AccountSearch }) {
  if (search.kind !== "accounts") {
    return null
  }
  const { query, accounts, truncated } = search
  if (accounts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-input px-5 py-7 text-center wrap-anywhere text-muted-foreground">
        {`Aucun membre ni banni dont le nom commence par « ${query} ».`}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      <Overline id={COUNT_ID} className="wrap-anywhere">
        {countSentence(accounts.length, truncated, query)}
      </Overline>
      <ul
        aria-labelledby={COUNT_ID}
        className="divide-y overflow-hidden rounded-xl border bg-card"
      >
        {accounts.map(({ id, name, username, avatarUrl, standing }) => (
          <li key={id}>
            <Link
              href={`/records/${id}`}
              prefetch={false}
              className="flex items-center gap-3.5 px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <MemberAvatar name={name} avatarUrl={avatarUrl} />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-x-3.5 gap-y-1.5 sm:flex-row sm:items-center">
                <div className="flex w-full min-w-0 flex-1 flex-col gap-px">
                  <span className="font-medium wrap-anywhere">{name}</span>
                  <span className="font-mono text-xs wrap-anywhere text-muted-foreground">{`@${username}`}</span>
                </div>
                <StandingBadge standing={standing} />
              </div>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
      {truncated && (
        <p className="text-sm text-muted-foreground">
          Seuls les 25 premiers comptes s’affichent : précise ta recherche.
        </p>
      )}
      {accounts.some(({ standing }) => isTimedOut(standing)) && (
        <p className="text-sm text-muted-foreground">Heures de Paris.</p>
      )}
    </div>
  )
}

function countSentence(count: number, truncated: boolean, query: string) {
  if (truncated) {
    return `Plus de ${count} comptes commencent par « ${query} »`
  }
  return count === 1
    ? `1 compte commence par « ${query} »`
    : `${count} comptes commencent par « ${query} »`
}
