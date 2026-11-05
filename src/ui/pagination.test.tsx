import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { Pagination } from "@/ui/pagination"

function hrefOf(page: number) {
  return page > 1 ? `/list?page=${page}` : "/list"
}

function navigation(page: number, pages: number) {
  return renderToStaticMarkup(
    <Pagination
      label="Pages de la liste"
      hrefOf={hrefOf}
      page={page}
      pages={pages}
    />
  )
}

function text(content: string | undefined) {
  return (content ?? "").replace(/<[^>]*>/g, "")
}

function entriesOf(html: string) {
  return Array.from(
    html.matchAll(
      /<a[^>]*\shref="([^"]*)"[^>]*>(.*?)<\/a>|<span[^>]*\saria-current="page"[^>]*>(.*?)<\/span><\/li>|<li[^>]*\saria-hidden="true"[^>]*>(.*?)<\/li>/g
    ),
    ([, href, linkContent, currentContent, hiddenContent]) => {
      if (href !== undefined) {
        return { link: text(linkContent), href }
      }
      return currentContent !== undefined
        ? { current: text(currentContent) }
        : { hidden: text(hiddenContent) }
    }
  )
}

function lists(html: string) {
  const nav = /<nav([^>]*)>(.*)<\/nav>/.exec(html)
  const [before = "", compact = "", between = "", regular = "", after = ""] =
    /^(.*?)<ol[^>]*>(.*?)<\/ol>(.*?)<ol[^>]*>(.*?)<\/ol>(.*)$/
      .exec(nav?.[2] ?? "")
      ?.slice(1) ?? []
  return {
    label: /\saria-label="([^"]*)"/.exec(nav?.[1] ?? "")?.[1],
    before: entriesOf(before),
    compact: entriesOf(compact),
    regular: entriesOf(regular),
    after: entriesOf(between + after),
  }
}

function entries(html: string) {
  const { label, before, regular, after } = lists(html)
  return { label, items: [...before, ...regular, ...after] }
}

test("one page needs no navigation", () => {
  expect(navigation(1, 1)).toBe("")
})

test("a page in the middle links to the previous page, to every page but its own, which is marked as the current one and is no link, and to the next page", () => {
  expect(entries(navigation(2, 3))).toEqual({
    label: "Pages de la liste",
    items: [
      { link: "Page précédente", href: "/list" },
      { link: "Page 1", href: "/list" },
      { current: "Page 2" },
      { link: "Page 3", href: "/list?page=3" },
      { link: "Page suivante", href: "/list?page=3" },
    ],
  })
})

test("the first page has no previous page to go to, and the last no next page", () => {
  expect(entries(navigation(1, 3)).items).toEqual([
    { current: "Page 1" },
    { link: "Page 2", href: "/list?page=2" },
    { link: "Page 3", href: "/list?page=3" },
    { link: "Page suivante", href: "/list?page=2" },
  ])
  expect(entries(navigation(3, 3)).items).toEqual([
    { link: "Page précédente", href: "/list?page=2" },
    { link: "Page 1", href: "/list" },
    { link: "Page 2", href: "/list?page=2" },
    { current: "Page 3" },
  ])
})

test("past 7 pages, the navigation shows the first and the last page, the current one and its neighbours, a gap hidden from assistive technologies between them", () => {
  const { regular } = lists(navigation(10, 20))

  expect(regular).toEqual([
    { link: "Page 1", href: "/list" },
    { hidden: "…" },
    { link: "Page 9", href: "/list?page=9" },
    { current: "Page 10" },
    { link: "Page 11", href: "/list?page=11" },
    { hidden: "…" },
    { link: "Page 20", href: "/list?page=20" },
  ])
})

test("a second list of page numbers, for a screen narrower than 640 px, shows at most 5 of them, with the same links, the gap hidden from assistive technologies too", () => {
  expect(lists(navigation(5, 9)).compact).toEqual([
    { link: "Page 1", href: "/list" },
    { hidden: "…" },
    { link: "Page 4", href: "/list?page=4" },
    { current: "Page 5" },
    { link: "Page 6", href: "/list?page=6" },
    { hidden: "…" },
    { link: "Page 9", href: "/list?page=9" },
  ])
  expect(lists(navigation(4, 9)).compact).toEqual([
    { link: "Page 1", href: "/list" },
    { hidden: "…" },
    { link: "Page 3", href: "/list?page=3" },
    { current: "Page 4" },
    { link: "Page 5", href: "/list?page=5" },
    { hidden: "…" },
    { link: "Page 9", href: "/list?page=9" },
  ])
})

test("the compact list shows every page up to 5, where the full one shows every page up to 7", () => {
  expect(lists(navigation(1, 5)).compact).toHaveLength(5)
  expect(lists(navigation(1, 6)).regular).toHaveLength(6)
  expect(lists(navigation(1, 6)).compact).toEqual([
    { current: "Page 1" },
    { link: "Page 2", href: "/list?page=2" },
    { hidden: "…" },
    { link: "Page 6", href: "/list?page=6" },
  ])
})

test("the previous and next pages carry a hidden arrow and their text, which a narrow screen keeps for assistive technologies alone", () => {
  const html = navigation(2, 3)

  expect(
    /<a[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span class="sr-only[^"]*">Page précédente<\/span><\/a>/.test(
      html
    )
  ).toBe(true)
  expect(
    /<a[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span class="sr-only[^"]*">Page suivante<\/span><\/a>/.test(
      html
    )
  ).toBe(true)
})
