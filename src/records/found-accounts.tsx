import { EmptyListFrame } from "@/ui/empty-list-frame"
import { Overline } from "@/ui/overline"
import { AccountRows } from "./account-rows"
import { ParisHoursNote } from "./paris-hours-note"
import type { AccountSearch } from "./search-accounts"

const COUNT_ID = "found-accounts-count"

export function FoundAccounts({ search }: { search: AccountSearch }) {
  if (search.kind !== "accounts") {
    return null
  }
  const { query, accounts, truncated } = search
  if (accounts.length === 0) {
    return (
      <EmptyListFrame>
        <p className="wrap-anywhere">
          {`Aucun membre ni banni dont le nom commence par « ${query} ».`}
        </p>
      </EmptyListFrame>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      <Overline id={COUNT_ID} className="wrap-anywhere">
        {countSentence(accounts.length, truncated, query)}
      </Overline>
      <AccountRows accounts={accounts} labelledBy={COUNT_ID} />
      {truncated && (
        <p className="text-sm text-muted-foreground">
          Seuls les 25 premiers comptes s’affichent : précise ta recherche.
        </p>
      )}
      <ParisHoursNote accounts={accounts} />
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
