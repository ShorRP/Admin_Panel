import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { AuditLogFilters } from "./audit-log-filters"
import { AuditLogTypeFilter } from "./audit-log-type-filter"

const NO_FILTER: AuditLogFilters = { type: null, author: null, account: null }

function render(filters: Partial<AuditLogFilters>) {
  return renderToStaticMarkup(
    <AuditLogTypeFilter filters={{ ...NO_FILTER, ...filters }} />
  )
}

function hrefOf(link: string) {
  return /\shref="([^"]*)"/.exec(link)?.[1]?.replaceAll("&amp;", "&")
}

function typeLinks(html: string) {
  const [, nav = ""] =
    /<nav aria-label="Filtrer par type"[^>]*>(.*?)<\/nav>/.exec(html) ?? []
  return Array.from(
    nav.matchAll(/<li>(<a[^>]*>(.*?)<\/a>)<\/li>/g),
    ([, link = "", text]) => ({
      text,
      href: hrefOf(link),
      current: /\saria-current="([^"]*)"/.exec(link)?.[1],
    })
  )
}

function resetLinks(html: string) {
  return Array.from(
    html.matchAll(/(<a[^>]*>)Réinitialiser<\/a>/g),
    ([, link = ""]) => hrefOf(link)
  )
}

const TYPES = [
  { text: "Tout", href: "/audit-log" },
  { text: "Mots interdits", href: "/audit-log?type=blocked-words" },
  { text: "Exclusions", href: "/audit-log?type=timeouts" },
  { text: "Expulsions", href: "/audit-log?type=kicks" },
  { text: "Bannissements", href: "/audit-log?type=bans" },
]

function markedCurrent(text: string) {
  return TYPES.map((link) => ({
    ...link,
    current: link.text === text ? "true" : undefined,
  }))
}

test("with no filter chosen, the filter links each type, « Tout » marked as the current one, and offers no reset", () => {
  const html = render({})

  expect(typeLinks(html)).toEqual(markedCurrent("Tout"))
  expect(resetLinks(html)).toEqual([])
})

test.each([
  ["blocked-words", "Mots interdits"],
  ["timeouts", "Exclusions"],
  ["kicks", "Expulsions"],
  ["bans", "Bannissements"],
] as const)(
  "with the type %s chosen, the filter marks « %s » as the current one, and « Réinitialiser » leads back to every type",
  (type, text) => {
    const html = render({ type })

    expect(typeLinks(html)).toEqual(markedCurrent(text))
    expect(resetLinks(html)).toEqual(["/audit-log"])
  }
)

test("each link of the filter keeps the author and the account chosen, « Tout » included, and « Réinitialiser » drops them all", () => {
  const html = render({
    type: "kicks",
    author: "bryn",
    account: "<@1400000000000000003>",
  })

  expect(typeLinks(html).map(({ text, href }) => ({ text, href }))).toEqual([
    {
      text: "Tout",
      href: "/audit-log?author=bryn&account=%3C%401400000000000000003%3E",
    },
    {
      text: "Mots interdits",
      href: "/audit-log?type=blocked-words&author=bryn&account=%3C%401400000000000000003%3E",
    },
    {
      text: "Exclusions",
      href: "/audit-log?type=timeouts&author=bryn&account=%3C%401400000000000000003%3E",
    },
    {
      text: "Expulsions",
      href: "/audit-log?type=kicks&author=bryn&account=%3C%401400000000000000003%3E",
    },
    {
      text: "Bannissements",
      href: "/audit-log?type=bans&author=bryn&account=%3C%401400000000000000003%3E",
    },
  ])
  expect(resetLinks(html)).toEqual(["/audit-log"])
})

test.each([
  [{ author: "bryn" }, "?author=bryn"],
  [{ account: "Lyra des Brumes" }, "?account=Lyra+des+Brumes"],
])(
  "with only %j chosen, « Tout » stays the current type and « Réinitialiser » shows, leading back to the unfiltered audit log",
  (filters, query) => {
    const html = render(filters)

    expect(typeLinks(html)[0]).toEqual({
      text: "Tout",
      href: `/audit-log${query}`,
      current: "true",
    })
    expect(resetLinks(html)).toEqual(["/audit-log"])
  }
)
