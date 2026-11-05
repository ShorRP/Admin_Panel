import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FilterPills, type FilterPill } from "@/ui/filter-pills"

const PILLS: FilterPill[] = [
  { label: "Tout", href: "/page", current: true },
  { label: "Rouges", href: "/page?color=red", current: false, badge: <b>3</b> },
]

function render(resetHref: string | null) {
  return renderToStaticMarkup(
    <FilterPills
      label="Filtrer par couleur"
      pills={PILLS}
      resetHref={resetHref}
    />
  )
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

test("the pills are the links of a navigation named by its label, each leading to its address", () => {
  const html = render(null)

  expect(html).toContain('<nav aria-label="Filtrer par couleur">')
  expect(
    Array.from(html.matchAll(/<a[^>]*\shref="([^"]*)"/g), ([, href]) => href)
  ).toEqual(["/page", "/page?color=red"])
})

test("the current pill is marked, and the others are not", () => {
  const links = Array.from(render(null).matchAll(/<a([^>]*)>/g), ([, a]) => a)

  expect(links[0]).toContain('aria-current="true"')
  expect(links[1]).not.toContain("aria-current")
})

test("a pill shows its badge after its label", () => {
  expect(text(render(null))).toBe("ToutRouges3")
})

test("the reset link shows only when it leads somewhere", () => {
  expect(text(render(null))).not.toContain("Réinitialiser")
  expect(render("/page")).toMatch(
    /<a[^>]*\shref="\/page"[^>]*>Réinitialiser<\/a>/
  )
})
