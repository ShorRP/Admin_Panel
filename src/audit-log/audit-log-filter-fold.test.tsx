import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogFilterFold } from "./audit-log-filter-fold"
import { NO_FILTER, type AuditLogFilters } from "./audit-log-filters"

const NBSP = String.fromCharCode(0xa0)

function renderFold(filters: Partial<AuditLogFilters>) {
  return renderToStaticMarkup(
    <AuditLogFilterFold filters={{ ...NO_FILTER, ...filters }} />
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function chips(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>(.*?)<\/a>/g),
    ([, attributes = "", content = ""]) => ({
      href: attribute(attributes, "href")?.replaceAll("&amp;", "&"),
      name: content.replace(/<svg.*?<\/svg>/g, "").replace(/<[^>]*>/g, ""),
    })
  )
}

test("with no filter set, the button is named « Filtres » and counts none, and no chip shows", () => {
  const html = renderFold({})

  expect(html).toMatch(/<button[^>]*>.*Filtres<\/button>/)
  expect(html).not.toContain("filtre actif")
  expect(html).not.toContain("filtres actifs")
  expect(html).not.toContain("<ul")
})

test.each([
  [{ author: "Sigrid" }, "1 filtre actif"],
  [{ account: "lyra" }, "1 filtre actif"],
  [{ text: "spam" }, "1 filtre actif"],
  [{ from: "2026-10-05" }, "1 filtre actif"],
  [{ to: "2026-10-31" }, "1 filtre actif"],
  [{ author: "Sigrid", account: "lyra" }, "2 filtres actifs"],
  [
    {
      author: "Sigrid",
      account: "lyra",
      text: "spam",
      from: "2026-10-05",
      to: "2026-10-31",
    },
    "5 filtres actifs",
  ],
])(
  "with %j set, the button counts the filters of the sheet, in words for assistive technologies",
  (filters, words) => {
    expect(renderFold(filters)).toContain(`>${words}</span>`)
  }
)

test("the type chosen is not counted, since its pills stay in view, and no chip shows for it", () => {
  const html = renderFold({ type: "kicks" })

  expect(html).not.toContain("filtre actif")
  expect(chips(html)).toEqual([])
})

test("each filter set shows as a chip, a link to the audit log without that filter, keeping the type and the other filters, a day written out", () => {
  expect(
    chips(
      renderFold({
        type: "kicks",
        author: "Sigrid",
        account: "lyra",
        text: "spam",
        from: "2026-10-05",
        to: "2026-10-31",
      })
    )
  ).toEqual([
    {
      href: "/audit-log?type=kicks&account=lyra&text=spam&from=2026-10-05&to=2026-10-31",
      name: `Retirer le filtre Auteur${NBSP}: Sigrid`,
    },
    {
      href: "/audit-log?type=kicks&author=Sigrid&text=spam&from=2026-10-05&to=2026-10-31",
      name: `Retirer le filtre Compte${NBSP}: lyra`,
    },
    {
      href: "/audit-log?type=kicks&author=Sigrid&account=lyra&from=2026-10-05&to=2026-10-31",
      name: `Retirer le filtre Texte${NBSP}: spam`,
    },
    {
      href: "/audit-log?type=kicks&author=Sigrid&account=lyra&text=spam&to=2026-10-31",
      name: `Retirer le filtre Du${NBSP}: 5 oct. 2026`,
    },
    {
      href: "/audit-log?type=kicks&author=Sigrid&account=lyra&text=spam&from=2026-10-05",
      name: `Retirer le filtre Au${NBSP}: 31 oct. 2026`,
    },
  ])
})
