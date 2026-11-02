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

function navigation(
  page: number,
  pages: number,
  filters: AccountListFilters = NO_FILTERS
) {
  return renderToStaticMarkup(
    <AccountPagination page={page} pages={pages} filters={filters} />
  )
}

function entries(html: string) {
  const nav = /<nav([^>]*)>(.*)<\/nav>/.exec(html)
  const label = /\saria-label="([^"]*)"/.exec(nav?.[1] ?? "")?.[1]
  const items = Array.from(
    (nav?.[2] ?? "").matchAll(
      /<a[^>]*\shref="([^"]*)"[^>]*>(.*?)<\/a>|<span[^>]*\saria-current="page"[^>]*>(.*?)<\/span><\/li>|<li[^>]*\saria-hidden="true"[^>]*>(.*?)<\/li>/g
    ),
    ([, href, linkContent, currentContent, hiddenContent]) => {
      const text = (content: string | undefined) =>
        (content ?? "").replace(/<[^>]*>/g, "")
      if (href !== undefined) {
        return { link: text(linkContent), href }
      }
      return currentContent !== undefined
        ? { current: text(currentContent) }
        : { hidden: text(hiddenContent) }
    }
  )
  return { label, items }
}

test("one page of accounts needs no navigation", () => {
  expect(navigation(1, 1)).toBe("")
})

test("a page in the middle links to the previous page, to every page but its own, which is marked as the current one and is no link, and to the next page", () => {
  expect(entries(navigation(2, 3))).toEqual({
    label: "Pages des comptes",
    items: [
      { link: "Page précédente", href: "/records" },
      { link: "Page 1", href: "/records" },
      { current: "Page 2" },
      { link: "Page 3", href: "/records?page=3" },
      { link: "Page suivante", href: "/records?page=3" },
    ],
  })
})

test("the first page has no previous page to go to, and the last no next page", () => {
  expect(entries(navigation(1, 3)).items).toEqual([
    { current: "Page 1" },
    { link: "Page 2", href: "/records?page=2" },
    { link: "Page 3", href: "/records?page=3" },
    { link: "Page suivante", href: "/records?page=2" },
  ])
  expect(entries(navigation(3, 3)).items).toEqual([
    { link: "Page précédente", href: "/records?page=2" },
    { link: "Page 1", href: "/records" },
    { link: "Page 2", href: "/records?page=2" },
    { current: "Page 3" },
  ])
})

test("past 7 pages, the navigation shows the first and the last page, the current one and its neighbours, a gap hidden from assistive technologies between them", () => {
  const { items } = entries(navigation(10, 20))

  expect(items.slice(1, -1)).toEqual([
    { link: "Page 1", href: "/records" },
    { hidden: "…" },
    { link: "Page 9", href: "/records?page=9" },
    { current: "Page 10" },
    { link: "Page 11", href: "/records?page=11" },
    { hidden: "…" },
    { link: "Page 20", href: "/records?page=20" },
  ])
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

  const hrefs = entries(navigation(2, 3, filters)).items.map((item) =>
    "href" in item && item.href !== undefined
      ? item.href.replaceAll("&amp;", "&")
      : null
  )

  expect(hrefs).toEqual([
    `/records?${kept}`,
    `/records?${kept}`,
    null,
    `/records?${kept}&page=3`,
    `/records?${kept}&page=3`,
  ])
})

test("the previous and next pages carry a hidden arrow before and after their text", () => {
  const html = navigation(2, 3)

  expect(
    /<a[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Page précédente<\/a>/.test(
      html
    )
  ).toBe(true)
  expect(
    /<a[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Page suivante<\/a>/.test(
      html
    )
  ).toBe(true)
})
