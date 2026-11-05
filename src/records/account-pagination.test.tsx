import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { AccountListFilters } from "./account-list-filters"
import { AccountPagination } from "./account-pagination"

const NO_FILTERS: AccountListFilters = {
  query: null,
  role: null,
  standing: null,
  joined: null,
  created: null,
  bots: null,
  sort: null,
}

function hrefs(html: string) {
  return Array.from(html.matchAll(/<a[^>]*\shref="([^"]*)"/g), ([, href]) =>
    href?.replaceAll("&amp;", "&")
  )
}

test("the navigation between the pages of accounts is named « Pages des comptes »", () => {
  const html = renderToStaticMarkup(
    <AccountPagination page={1} pages={3} filters={NO_FILTERS} />
  )

  expect(/<nav[^>]*\saria-label="([^"]*)"/.exec(html)?.[1]).toBe(
    "Pages des comptes"
  )
})

test("every link keeps the search, the filters and the sort, and adds its page, the first page having none", () => {
  const filters: AccountListFilters = {
    query: "ald",
    role: "1300000000000000001",
    standing: "members",
    joined: "6m",
    created: "7d",
    bots: "shown",
    sort: "joined-old",
  }
  const kept =
    "query=ald&role=1300000000000000001&standing=members&joined=6m&created=7d&bots=shown&sort=joined-old"

  const html = renderToStaticMarkup(
    <AccountPagination page={2} pages={3} filters={filters} />
  )

  expect(hrefs(html)).toContain(`/records?${kept}`)
  expect(hrefs(html)).toContain(`/records?${kept}&page=3`)
  expect(
    hrefs(html).every((href) => href?.startsWith(`/records?${kept}`))
  ).toBe(true)
})
