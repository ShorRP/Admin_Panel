import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { GameLogFilterFold } from "./game-log-filter-fold"
import { NO_FILTERS, type GameLogFilters } from "./game-log-filters"

function renderFold(filters: Partial<GameLogFilters>) {
  return renderToStaticMarkup(
    <GameLogFilterFold filters={{ ...NO_FILTERS, ...filters }} />
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
  expect(html).not.toContain("filtre")
  expect(html).not.toContain("<ul")
})

test.each([
  [{ text: "heal" }, "1 filtre actif"],
  [{ from: "2026-11-01" }, "1 filtre actif"],
  [{ text: "heal", from: "2026-11-01", to: "2026-11-05" }, "3 filtres actifs"],
])(
  "with %j set, the button counts the filters of the sheet, in words for assistive technologies",
  (filters, words) => {
    expect(renderFold(filters)).toContain(`>${words}</span>`)
  }
)

test("each filter set shows as a chip, a link to the game log without that filter and without a cursor, the others kept, a day written out", () => {
  expect(
    chips(renderFold({ text: "heal", from: "2026-11-01", to: "2026-11-05" }))
  ).toEqual([
    {
      href: "/game-log?from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Texte : heal",
    },
    {
      href: "/game-log?text=heal&to=2026-11-05",
      name: "Retirer le filtre Du : 1 nov. 2026",
    },
    {
      href: "/game-log?text=heal&from=2026-11-01",
      name: "Retirer le filtre Au : 5 nov. 2026",
    },
  ])
})
