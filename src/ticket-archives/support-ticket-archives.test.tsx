import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type {
  ArchivesPage,
  PagedTicketArchive,
  TicketArchivePage,
} from "./read-ticket-archive-page"
import { SupportTicketArchives } from "./support-ticket-archives"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function items(html: string) {
  return Array.from(html.matchAll(/<li[^>]*>(.*?)<\/li>/g), ([, item]) =>
    text(item ?? "")
  )
}

function linksOf(html: string) {
  return Array.from(
    html.matchAll(/<a[^>]*\shref="([^"]*)"[^>]*>(.*?)<\/a>/g),
    ([, href, label]) => [href, text(label ?? "")]
  )
}

const REPORT: PagedTicketArchive = {
  messageId: "1500000000000000002",
  requestKind: "🚨 Signaler un joueur",
  opener: { id: "1400000000000000001", name: "Lyra" },
  closer: { id: "1400000000000000002", name: "Brynja la Rousse" },
  openedAt: new Date("2026-11-03T14:32:10Z"),
  closedAt: new Date("2026-11-03T15:10:59Z"),
  reason: "Signalement traité, joueur averti",
}

const UNKNOWN: PagedTicketArchive = {
  messageId: "1500000000000000001",
  requestKind: null,
  opener: { id: "1400000000000000003", name: null },
  closer: { id: "1400000000000000004", name: null },
  openedAt: new Date("2026-11-01T09:00:00Z"),
  closedAt: new Date("2026-11-01T09:30:00Z"),
  reason: "Résolu",
}

function pageOf(overrides: Partial<ArchivesPage> = {}): ArchivesPage {
  return {
    kind: "page",
    archives: [REPORT, UNKNOWN],
    page: 1,
    pages: 1,
    first: 1,
    last: 2,
    total: 2,
    complete: true,
    ...overrides,
  }
}

function render(read: TicketArchivePage, opensModeration = false) {
  return renderToStaticMarkup(
    <SupportTicketArchives read={read} opensModeration={opensModeration} />
  )
}

test("the archives channel not being configured is said, with no list", () => {
  const html = render({ kind: "unconfigured" })

  expect(text(html)).toBe(
    "Le salon des archives n’est pas configuré pour ce serveur Discord."
  )
  expect(html).not.toContain("aria-labelledby")
})

test("a Discord server with no archive says so, with no list and no navigation", () => {
  const html = render(
    pageOf({ archives: [], first: 0, last: 0, total: 0, pages: 1 })
  )

  expect(text(html)).toBe("Aucune archive de ticket à afficher.")
  expect(html).not.toContain("aria-labelledby")
  expect(html).not.toContain("<nav")
})

test("each archive says its request kind, who opened it and who closed it, when, in Paris time, and why, in the order given", () => {
  const html = render(pageOf())

  expect(items(html)).toEqual([
    "🚨 Signaler un joueurOuvert parLyra3 nov. 2026, 15:32Fermé parBrynja la Rousse3 nov. 2026, 16:10Motif : Signalement traité, joueur averti",
    "Type de demande inconnuOuvert par14000000000000000031 nov. 2026, 10:00Fermé par14000000000000000041 nov. 2026, 10:30Motif : Résolu",
  ])
})

test("each date sits in a <time> that keeps its full moment", () => {
  const html = render(pageOf({ archives: [REPORT] }))

  expect(
    Array.from(
      html.matchAll(/<time dateTime="([^"]*)"/g),
      ([, moment]) => moment
    )
  ).toEqual(["2026-11-03T14:32:10.000Z", "2026-11-03T15:10:59.000Z"])
})

test("a staff member who moderates follows the opener and the closer of an archive to their record, by name, or by ID when none is known", () => {
  const html = render(pageOf(), true)

  expect(linksOf(html)).toEqual([
    ["/records/1400000000000000001", "Lyra"],
    ["/records/1400000000000000002", "Brynja la Rousse"],
    ["/records/1400000000000000003", "1400000000000000003"],
    ["/records/1400000000000000004", "1400000000000000004"],
  ])
})

test("a staff member who does not moderate reads the opener and the closer as text, with no link to a record", () => {
  const html = render(pageOf(), false)

  expect(linksOf(html)).toEqual([])
  expect(items(html)[0]).toContain("Ouvert parLyra")
  expect(items(html)[0]).toContain("Fermé parBrynja la Rousse")
})

test("the list is named by the ranks of its first and last archive and their total", () => {
  const html = render(pageOf({ first: 26, last: 50, total: 312 }))

  expect(
    text(/<p[^>]*\sid="([^"]*)"[^>]*>(.*?)<\/p>/.exec(html)?.[2] ?? "")
  ).toBe("26–50 sur 312")
  const labelledBy = /<ol[^>]*\saria-labelledby="([^"]*)"/.exec(html)?.[1]
  expect(html).toContain(`id="${labelledBy}"`)
})

test("a rank that is alone is written alone, and the numbers keep the French thousands separator", () => {
  expect(
    text(render(pageOf({ first: 1_001, last: 1_001, total: 1_001 })))
  ).toContain("1 001 sur 1 001")
  expect(
    text(render(pageOf({ first: 1_001, last: 1_025, total: 12_345 })))
  ).toContain("1 001–1 025 sur 12 345")
})

test("one page needs no navigation, and several are linked by their number, with the page's address", () => {
  expect(render(pageOf())).not.toContain("<nav")

  const html = render(pageOf({ page: 2, pages: 3 }))

  expect(/<nav[^>]*\saria-label="([^"]*)"/.exec(html)?.[1]).toBe(
    "Pages des archives"
  )
  expect(linksOf(html)).toEqual([
    ["/support-tickets", "Page précédente"],
    ["/support-tickets", "Page 1"],
    ["/support-tickets?page=3", "Page 3"],
    ["/support-tickets", "Page 1"],
    ["/support-tickets?page=3", "Page 3"],
    ["/support-tickets?page=3", "Page suivante"],
  ])
})

test("a page whose messages hold no archive says so, and keeps the navigation to the others", () => {
  const html = render(
    pageOf({ archives: [], page: 2, pages: 3, first: 26, last: 50, total: 75 })
  )

  expect(text(html)).toContain("Aucune archive de ticket à afficher.")
  expect(html).not.toContain("aria-labelledby")
  expect(html).toContain("<nav")
})

test("archives that Discord's search does not reach in full say how many it reaches", () => {
  const html = render(
    pageOf({ page: 400, pages: 400, total: 10_001, complete: false })
  )

  expect(text(html)).toContain(
    "Discord ne permet de lire que les 10 000 archives les plus récentes : les plus anciennes ne s’affichent pas."
  )
})

test("archives that Discord's search reaches in full say nothing of what was not read", () => {
  expect(text(render(pageOf()))).not.toContain("Discord ne permet")
})
