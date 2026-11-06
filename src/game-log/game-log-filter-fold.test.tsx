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
  [{ cell: "3c", plugin: "Skyrim.esm" }, "2 filtres actifs"],
  [
    {
      action: "heal",
      character: "Merida",
      account: "2094594320",
      target: "4278190080",
      cell: "3c",
      plugin: "Skyrim.esm",
      reason: "test",
      text: "heal",
      from: "2026-11-01",
      to: "2026-11-05",
    },
    "10 filtres actifs",
  ],
])(
  "with %j set, the button counts the filters of the sheet, in words for assistive technologies",
  (filters, words) => {
    expect(renderFold(filters)).toContain(`>${words}</span>`)
  }
)

test("the category, which the pills choose, is no chip and no count", () => {
  const html = renderFold({ category: "characters" })

  expect(html).not.toContain("filtre actif")
  expect(chips(html)).toEqual([])
})

test("each filter set shows as a chip, a link to the game log without that filter and without a cursor, the others kept, a day written out", () => {
  expect(
    chips(
      renderFold({
        category: "administration",
        action: "heal",
        character: "Merida",
        account: "2094594320",
        target: "4278190080",
        cell: "3c",
        plugin: "Skyrim.esm",
        reason: "test",
        text: "heal",
        from: "2026-11-01",
        to: "2026-11-05",
      })
    )
  ).toEqual([
    {
      href: "/game-log?category=administration&character=Merida&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Action : heal",
    },
    {
      href: "/game-log?category=administration&action=heal&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Personnage : Merida",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Compte de jeu : 2094594320",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Cible : 4278190080",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&target=4278190080&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Cellule : 3c",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&target=4278190080&cell=3c&reason=test&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Plugin : Skyrim.esm",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&text=heal&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Motif : test",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Texte : heal",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&to=2026-11-05",
      name: "Retirer le filtre Du : 1 nov. 2026",
    },
    {
      href: "/game-log?category=administration&action=heal&character=Merida&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01",
      name: "Retirer le filtre Au : 5 nov. 2026",
    },
  ])
})
