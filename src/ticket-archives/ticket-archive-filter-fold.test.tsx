import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { TicketArchiveFilterFold } from "./ticket-archive-filter-fold"
import { NO_FILTERS, type TicketArchiveFilters } from "./ticket-archive-filters"

function renderFold(filters: Partial<TicketArchiveFilters>) {
  return renderToStaticMarkup(
    <TicketArchiveFilterFold filters={{ ...NO_FILTERS, ...filters }} />
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

test("with no filter set, the button is « Filtres » and counts none, and no chip shows", () => {
  const html = renderFold({})

  expect(html).toMatch(/<button[^>]*>.*Filtres<\/button>/)
  expect(html).not.toContain("filtre actif")
  expect(html).not.toContain("<ul")
})

test.each([
  [{ opener: "aldis" }, "1 filtre actif"],
  [{ reason: "bug", sort: "oldest" }, "2 filtres actifs"],
  [
    {
      opener: "a",
      closer: "b",
      reason: "c",
      from: "2026-10-05",
      to: "2026-10-31",
    },
    "5 filtres actifs",
  ],
] as const)(
  "with %j set, the button counts the filters of the sheet, in words for assistive technologies",
  (filters, words) => {
    expect(renderFold(filters)).toContain(`>${words}</span>`)
  }
)

test("the kind chosen is not counted, since its pills stay in view, and no chip shows for it", () => {
  const html = renderFold({ kind: "player-report" })

  expect(html).not.toContain("filtre actif")
  expect(chips(html)).toEqual([])
})

test("each filter set shows as a chip, a link to the archives without that filter, keeping the kind and the other filters, on the first page", () => {
  expect(
    chips(
      renderFold({
        kind: "rp-request",
        opener: "Sigrid",
        from: "2026-10-05",
        on: "opened",
        sort: "oldest",
      })
    )
  ).toEqual([
    {
      href: "/support-tickets?kind=rp-request&from=2026-10-05&on=opened&sort=oldest",
      name: "Retirer le filtre Ouvreur : Sigrid",
    },
    {
      href: "/support-tickets?kind=rp-request&opener=Sigrid&on=opened&sort=oldest",
      name: "Retirer le filtre Du : 5 oct. 2026",
    },
    {
      href: "/support-tickets?kind=rp-request&opener=Sigrid&from=2026-10-05&sort=oldest",
      name: "Retirer le filtre Période sur : L’ouverture",
    },
    {
      href: "/support-tickets?kind=rp-request&opener=Sigrid&from=2026-10-05&on=opened",
      name: "Retirer le filtre Ordre : Plus anciennes d’abord",
    },
  ])
})

test("the fold is for the screens under 768 px", () => {
  expect(renderFold({})).toMatch(/^<div class="[^"]*\bmd:hidden\b/)
})
