import { Pagination } from "@/ui/pagination"
import type { AccountListFilters } from "./account-list-filters"
import { accountListHref } from "./account-list-href"

export function AccountPagination({
  filters,
  page,
  pages,
}: {
  filters: AccountListFilters
  page: number
  pages: number
}) {
  return (
    <Pagination
      label="Pages des comptes"
      hrefOf={(target) => accountListHref(filters, target)}
      page={page}
      pages={pages}
    />
  )
}
