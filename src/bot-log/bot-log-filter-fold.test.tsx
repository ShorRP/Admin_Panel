import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BotLogFilterFold } from "./bot-log-filter-fold"
import { NO_FILTERS, type BotLogFilters } from "./bot-log-filters"

function renderFold(filters: Partial<BotLogFilters>) {
  return renderToStaticMarkup(
    <BotLogFilterFold filters={{ ...NO_FILTERS, ...filters }} />
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

test("with no filter set, the button is named « Filtres » and counts none, and no chip shows", () => {
  const html = renderFold({})

  expect(html).toMatch(/<button[^>]*>.*Filtres<\/button>/)
  expect(html).not.toContain("filtre")
  expect(html).not.toContain("<ul")
})

test.each([
  [{ action: "fermé" }, "1 filtre actif"],
  [{ channel: "ticket-0042" }, "1 filtre actif"],
  [{ account: "lyra", text: "résolu", from: "2026-11-01" }, "3 filtres actifs"],
])(
  "with %j set, the button counts the filters of the sheet, in words for assistive technologies",
  (filters, words) => {
    expect(renderFold(filters)).toContain(`>${words}</span>`)
  }
)

test("the family is its pills' and makes no chip", () => {
  expect(chips(renderFold({ family: "tickets" }))).toEqual([])
})

test("each filter set shows as a chip, a link to the Bot log without that filter and without a cursor, the family and the others kept, a day written out", () => {
  expect(
    chips(
      renderFold({
        family: "tickets",
        action: "fermé",
        account: "lyra",
        channel: "ticket-0042",
        text: "résolu",
        from: "2026-11-01",
        to: "2026-11-05",
      })
    )
  ).toEqual([
    {
      href: "/bot-log?family=tickets&account=lyra&channel=ticket-0042&text=r%C3%A9solu&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Action : fermé",
    },
    {
      href: "/bot-log?family=tickets&action=ferm%C3%A9&channel=ticket-0042&text=r%C3%A9solu&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Compte : lyra",
    },
    {
      href: "/bot-log?family=tickets&action=ferm%C3%A9&account=lyra&text=r%C3%A9solu&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Salon : ticket-0042",
    },
    {
      href: "/bot-log?family=tickets&action=ferm%C3%A9&account=lyra&channel=ticket-0042&from=2026-11-01&to=2026-11-05",
      name: "Retirer le filtre Texte : résolu",
    },
    {
      href: "/bot-log?family=tickets&action=ferm%C3%A9&account=lyra&channel=ticket-0042&text=r%C3%A9solu&to=2026-11-05",
      name: "Retirer le filtre Du : 1 nov. 2026",
    },
    {
      href: "/bot-log?family=tickets&action=ferm%C3%A9&account=lyra&channel=ticket-0042&text=r%C3%A9solu&from=2026-11-01",
      name: "Retirer le filtre Au : 5 nov. 2026",
    },
  ])
})
