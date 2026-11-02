import { AccountList } from "./account-list"
import { FoundAccounts } from "./found-accounts"
import type { AccountListing } from "./list-accounts"

export function AccountsView({
  list,
}: {
  list: Exclude<AccountListing, { kind: "record" }>
}) {
  return list.kind === "page" ? (
    <AccountList list={list} />
  ) : (
    <FoundAccounts search={list} />
  )
}
