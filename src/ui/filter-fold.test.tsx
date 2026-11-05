import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FilterFold } from "@/ui/filter-fold"

const CHIPS = [
  { name: "Qui", value: "Sigrid", href: "/events?what=heal" },
  { name: "Quoi", value: "heal", href: "/events?who=Sigrid" },
]

function render(chips: { name: string; value: string; href: string }[]) {
  return renderToStaticMarkup(
    <FilterFold
      label="Qui et quoi"
      chips={chips}
      action="/events"
      hiddenFields={[{ name: "kind", value: "kicks" }]}
      resetHref="/events"
      submitLabel="Filtrer"
    >
      <input name="who" />
    </FilterFold>
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

test("the fold shows under md alone", () => {
  const classes =
    attribute(/<div[^>]*>/.exec(render([]))?.[0] ?? "", "class")?.split(" ") ??
    []

  expect(classes).toContain("md:hidden")
})

test("the button names the sheet and counts the chips, in words for assistive technologies", () => {
  expect(render([])).toMatch(/<button[^>]*>.*Qui et quoi<\/button>/)
  expect(render([])).not.toContain("filtre")
  expect(render(CHIPS.slice(0, 1))).toContain(">1 filtre actif</span>")
  expect(render(CHIPS)).toContain(">2 filtres actifs</span>")
})

test("each chip shows after the button as a link to the address it is given, named by what it removes", () => {
  const html = render(CHIPS)
  const chips = Array.from(
    html.matchAll(/<a([^>]*)>(.*?)<\/a>/g),
    ([, attributes = "", content = ""]) => ({
      href: attribute(attributes, "href")?.replaceAll("&amp;", "&"),
      name: content.replace(/<svg.*?<\/svg>/g, "").replace(/<[^>]*>/g, ""),
    })
  )

  expect(chips).toEqual([
    { href: "/events?what=heal", name: "Retirer le filtre Qui : Sigrid" },
    { href: "/events?who=Sigrid", name: "Retirer le filtre Quoi : heal" },
  ])
  expect(html.indexOf("<ul")).toBeGreaterThan(html.indexOf("</button>"))
})

test("with no chip, no list shows", () => {
  expect(render([])).not.toContain("<ul")
})
