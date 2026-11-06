import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { GameLogCategoryFilter } from "./game-log-category-filter"
import { NO_FILTERS, type GameLogFilters } from "./game-log-filters"

function render(filters: Partial<GameLogFilters>) {
  return renderToStaticMarkup(
    <GameLogCategoryFilter filters={{ ...NO_FILTERS, ...filters }} />
  )
}

function pills(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>([^<]*)<\/a>/g),
    ([, attributes = "", label = ""]) => ({
      label,
      href: /\shref="([^"]*)"/.exec(attributes)?.[1]?.replaceAll("&amp;", "&"),
      current: attributes.includes('aria-current="true"'),
    })
  ).filter(({ label }) => label !== "Réinitialiser")
}

test("the pills are « Tout » and the two categories seen, in a navigation named by what it filters", () => {
  const html = render({})

  expect(html).toContain('<nav aria-label="Filtrer par catégorie">')
  expect(pills(html).map(({ label }) => label)).toEqual([
    "Tout",
    "Administration",
    "Personnages",
  ])
})

test("with no category chosen, « Tout » is the current pill, and each other pill leads to its category", () => {
  expect(pills(render({}))).toEqual([
    { label: "Tout", href: "/game-log", current: true },
    {
      label: "Administration",
      href: "/game-log?category=administration",
      current: false,
    },
    {
      label: "Personnages",
      href: "/game-log?category=characters",
      current: false,
    },
  ])
})

test("the pill of the category chosen is the current one", () => {
  expect(
    pills(render({ category: "characters" })).map(({ label, current }) => ({
      label,
      current,
    }))
  ).toEqual([
    { label: "Tout", current: false },
    { label: "Administration", current: false },
    { label: "Personnages", current: true },
  ])
})

test("a pill keeps the other filters and drops the cursor, and « Tout » drops the category alone", () => {
  expect(
    pills(render({ category: "characters", character: "Merida", text: "x" }))
  ).toEqual([
    {
      label: "Tout",
      href: "/game-log?character=Merida&text=x",
      current: false,
    },
    {
      label: "Administration",
      href: "/game-log?category=administration&character=Merida&text=x",
      current: false,
    },
    {
      label: "Personnages",
      href: "/game-log?category=characters&character=Merida&text=x",
      current: true,
    },
  ])
})

test("« Réinitialiser » shows once any filter is set, the category included, and leads to the bare page", () => {
  expect(render({})).not.toContain("Réinitialiser")
  expect(render({ plugin: "Skyrim" })).toMatch(
    /<a[^>]*\shref="\/game-log"[^>]*>Réinitialiser<\/a>/
  )
  expect(render({ category: "administration" })).toContain("Réinitialiser")
})
