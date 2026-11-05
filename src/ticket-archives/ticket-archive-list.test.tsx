import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { ReadTicketArchive } from "./read-ticket-archives"
import { TicketArchiveList } from "./ticket-archive-list"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function items(html: string) {
  return Array.from(html.matchAll(/<li[^>]*>(.*?)<\/li>/g), ([, item]) =>
    text(item ?? "")
  )
}

const REPORT: ReadTicketArchive = {
  messageId: "1500000000000000002",
  openerId: "1400000000000000001",
  requestKind: "🚨 Signaler un joueur",
  openedAt: new Date("2026-11-03T14:32:10Z"),
  closedAt: new Date("2026-11-03T15:10:59Z"),
  closer: { id: "1400000000000000002", name: "Brynja la Rousse" },
  reason: "Signalement traité, joueur averti",
}

const UNKNOWN: ReadTicketArchive = {
  messageId: "1500000000000000001",
  openerId: "1400000000000000001",
  requestKind: null,
  openedAt: new Date("2026-11-01T09:00:00Z"),
  closedAt: new Date("2026-11-01T09:30:00Z"),
  closer: { id: "1400000000000000003", name: null },
  reason: "Résolu",
}

test("the archives channel not being configured is said under the heading, with no list", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList archives={{ kind: "unconfigured" }} />
  )

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe("Tickets de support")
  expect(text(html)).toBe(
    "Tickets de supportLe salon des archives n’est pas configuré pour ce serveur Discord."
  )
  expect(html).not.toContain("<ol")
})

test("an account that opened no support ticket says so, with no list", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList
      archives={{ kind: "read", archives: [], complete: true }}
    />
  )

  expect(text(html)).toBe(
    "Tickets de supportAucun ticket de support archivé pour ce compte."
  )
  expect(html).not.toContain("<ol")
})

test("each archive says its request kind, when it opened and closed in Paris time, who closed it and why, in the order given", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList
      archives={{ kind: "read", archives: [REPORT, UNKNOWN], complete: true }}
    />
  )

  expect(items(html)).toEqual([
    "🚨 Signaler un joueurOuvert le 3 nov. 2026, 15:32, fermé le 3 nov. 2026, 16:10 par Brynja la Rousse.Motif : Signalement traité, joueur averti",
    "Type de demande inconnuOuvert le 1 nov. 2026, 10:00, fermé le 1 nov. 2026, 10:30 par 1400000000000000003.Motif : Résolu",
  ])
})

test("each date sits in a <time> that keeps its full moment", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList
      archives={{ kind: "read", archives: [REPORT], complete: true }}
    />
  )

  expect(
    Array.from(
      html.matchAll(/<time dateTime="([^"]*)"/g),
      ([, moment]) => moment
    )
  ).toEqual(["2026-11-03T14:32:10.000Z", "2026-11-03T15:10:59.000Z"])
})

test("the closer is a link to their record, by their name, or by their ID when none is known", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList
      archives={{ kind: "read", archives: [REPORT, UNKNOWN], complete: true }}
    />
  )

  expect(
    Array.from(
      html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g),
      ([, href, label]) => [href, text(label ?? "")]
    )
  ).toEqual([
    ["/records/1400000000000000002", "Brynja la Rousse"],
    ["/records/1400000000000000003", "1400000000000000003"],
  ])
})

test("archives read from fewer archives than cite the account say how many were read, whether the account opened or closed them, and that its older tickets may not show", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList
      archives={{ kind: "read", archives: [REPORT], complete: false }}
    />
  )

  expect(text(html)).toContain(
    "Seules les 100 archives les plus récentes où ce compte apparaît, qu’il les ait ouvertes ou fermées, ont été lues : ses tickets plus anciens ne s’affichent peut-être pas."
  )
  expect(text(html)).not.toContain("messages du salon")
})

test("archives read from every archive that cites the account say nothing of what was not read", () => {
  const html = renderToStaticMarkup(
    <TicketArchiveList
      archives={{ kind: "read", archives: [REPORT], complete: true }}
    />
  )

  expect(text(html)).not.toContain("Seuls les")
})
