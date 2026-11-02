import { EmptyListFrame } from "@/ui/empty-list-frame"
import { frenchNumber } from "@/ui/french-number"
import { Overline } from "@/ui/overline"
import { AccountPagination } from "./account-pagination"
import { AccountRows } from "./account-rows"
import type { AccountListPage } from "./list-accounts"
import { ParisHoursNote } from "./paris-hours-note"

const COUNT_ID = "found-accounts-count"

export function AccountList({ list }: { list: AccountListPage }) {
  const { accounts, page, pages } = list
  if (accounts.length === 0) {
    return (
      <EmptyListFrame>
        <p>Aucun compte à afficher.</p>
      </EmptyListFrame>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      <Overline id={COUNT_ID}>{ranksOf(list)}</Overline>
      <AccountRows accounts={accounts} labelledBy={COUNT_ID} />
      <ParisHoursNote accounts={accounts} />
      <AccountPagination page={page} pages={pages} />
    </div>
  )
}

function ranksOf({ first, last, total }: AccountListPage) {
  const ranks =
    first === last
      ? frenchNumber(first)
      : `${frenchNumber(first)}–${frenchNumber(last)}`
  return `${ranks} sur ${frenchNumber(total)}`
}
