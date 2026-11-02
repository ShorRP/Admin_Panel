import type { AccountListFilters } from "./account-list-filters"

const FILTER_NAMES = [
  "query",
  "role",
  "standing",
  "joined",
  "created",
  "bots",
  "sort",
] as const

export function accountListHref(filters: AccountListFilters, page: number) {
  const params = new URLSearchParams()
  for (const name of FILTER_NAMES) {
    const value = filters[name]
    if (value !== null) {
      params.set(name, value)
    }
  }
  if (page > 1) {
    params.set("page", String(page))
  }
  const query = params.toString()
  return query === "" ? "/records" : `/records?${query}`
}
