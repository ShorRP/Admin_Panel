import Link from "next/link"

import { MemberAvatar } from "@/ui/member-avatar"
import type { AccountSearch } from "./search-accounts"

export function FoundAccounts({ search }: { search: AccountSearch }) {
  if (search.kind !== "accounts") {
    return null
  }
  const { query, accounts, truncated } = search
  if (accounts.length === 0) {
    return (
      <p className="wrap-anywhere">
        {`Aucun membre ni banni dont le nom commence par « ${query} ».`}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col border-t">
        {accounts.map(({ id, name, username, avatarUrl, banned }) => (
          <li key={id} className="border-b">
            <Link
              href={`/records/${id}`}
              prefetch={false}
              className="flex items-center gap-3 px-2 py-2 transition-colors hover:bg-muted"
            >
              <MemberAvatar name={name} avatarUrl={avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="wrap-anywhere">{name}</div>
                <div className="text-sm wrap-anywhere text-muted-foreground">{`@${username}`}</div>
              </div>
              {banned && (
                <span className="shrink-0 rounded-sm border px-1.5 py-0.5 text-xs font-medium">
                  Banni
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {truncated && (
        <p>Seuls les 25 premiers comptes s’affichent : précise ta recherche.</p>
      )}
    </div>
  )
}
