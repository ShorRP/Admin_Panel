import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogTypeFilter } from "./audit-log-type-filter"
import type { ChangeType } from "./read-audit-log"

function render(type: ChangeType | null) {
  return renderToStaticMarkup(<AuditLogTypeFilter type={type} />)
}

function typeLinks(html: string) {
  const [, nav = ""] =
    /<nav aria-label="Filtrer par type"[^>]*>(.*?)<\/nav>/.exec(html) ?? []
  return Array.from(
    nav.matchAll(/<li>(<a[^>]*>(.*?)<\/a>)<\/li>/g),
    ([, link = "", text]) => ({
      text,
      href: /\shref="([^"]*)"/.exec(link)?.[1],
      current: /\saria-current="([^"]*)"/.exec(link)?.[1],
    })
  )
}

function resetLinks(html: string) {
  return Array.from(
    html.matchAll(/<a[^>]* href="([^"]*)"[^>]*>Réinitialiser<\/a>/g),
    ([, href]) => href
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

test("with no type chosen, the filter links each type, « Tout » marked as the current one, and offers no reset", () => {
  const html = render(null)

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
    const html = render(type)

    expect(typeLinks(html)).toEqual(markedCurrent(text))
    expect(resetLinks(html)).toEqual(["/audit-log"])
  }
)
