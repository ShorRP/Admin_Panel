import { renderToStaticMarkup } from "react-dom/server"
import { prerender } from "react-dom/static"
import { expect, test } from "vitest"

import { SupportTicketArchives } from "./support-ticket-archives"
import { NO_FILTERS, type TicketArchiveFilters } from "./ticket-archive-filters"
import type {
  ArchivesPage,
  KindCounts,
  PagedTicketArchive,
  TicketArchivePage,
} from "./ticket-archive-page"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function entries(html: string) {
  const list = /<ol[^>]*\saria-labelledby="[^"]*"[^>]*>(.*?)<\/ol>/.exec(html)
  return Array.from(
    (list?.[1] ?? "").matchAll(/<li[^>]*>(.*?)<\/li>/g),
    ([, item]) => text(item ?? "")
  )
}

function linksOf(html: string) {
  return Array.from(
    html.matchAll(/<a[^>]*\shref="([^"]*)"[^>]*>(.*?)<\/a>/g),
    ([, href, label]) => [href, text(label ?? "")]
  )
}

function archivesFooter(html: string) {
  return text(html.slice(html.lastIndexOf("</ol>")))
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

const COUNTS: KindCounts = {
  "technical-issue": 1_234,
  "player-report": 1,
  "rp-request": 0,
  "other-request": 12,
}

function pageOf(
  overrides: Partial<ArchivesPage> = {},
  filters: Partial<TicketArchiveFilters> = {}
): ArchivesPage {
  return {
    kind: "page",
    filters: { ...NO_FILTERS, ...filters },
    archives: [REPORT, UNKNOWN],
    page: 1,
    pages: 1,
    first: 1,
    last: 2,
    total: 2,
    complete: true,
    limit: "offset",
    kindCounts: { kind: "known", counts: COUNTS },
    accountNotice: null,
    ...overrides,
  }
}

function render(read: TicketArchivePage, opensModeration = false) {
  return renderToStaticMarkup(
    <SupportTicketArchives
      read={read}
      counts={null}
      opensModeration={opensModeration}
    />
  )
}

test("the archives channel not being configured is said, with no list and no filter", () => {
  const html = render({ kind: "unconfigured" })

  expect(text(html)).toBe(
    "Le salon des archives n’est pas configuré pour ce serveur Discord."
  )
  expect(html).not.toContain("aria-labelledby")
  expect(html).not.toContain("<form")
})

test("a Discord server with no archive says so, with no list, no navigation and no reset", () => {
  const html = render(
    pageOf({ archives: [], first: 0, last: 0, total: 0, pages: 1 })
  )

  expect(text(html)).toContain("Aucune archive de ticket à afficher.")
  expect(html).not.toContain("aria-labelledby")
  expect(html).not.toContain('aria-label="Pages des archives"')
  expect(linksOf(html).map(([, label]) => label)).not.toContain("Réinitialiser")
})

test("each archive says its request kind, who opened it and who closed it, when, in Paris time, and why, in the order given", () => {
  const html = render(pageOf())

  expect(entries(html)).toEqual([
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

  expect(
    linksOf(html).filter(([href]) => href?.startsWith("/records/"))
  ).toEqual([
    ["/records/1400000000000000001", "Lyra"],
    ["/records/1400000000000000002", "Brynja la Rousse"],
    ["/records/1400000000000000003", "1400000000000000003"],
    ["/records/1400000000000000004", "1400000000000000004"],
  ])
})

test("a staff member who does not moderate reads the opener and the closer as text, with no link to a record", () => {
  const html = render(pageOf(), false)

  expect(linksOf(html).filter(([href]) => href?.includes("/records/"))).toEqual(
    []
  )
  expect(entries(html)[0]).toContain("Ouvert parLyra")
  expect(entries(html)[0]).toContain("Fermé parBrynja la Rousse")
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
  expect(render(pageOf())).not.toContain('aria-label="Pages des archives"')

  const html = render(pageOf({ page: 2, pages: 3 }))

  expect(html).toContain('aria-label="Pages des archives"')
  expect(
    linksOf(html)
      .filter(([href]) => href?.startsWith("/support-tickets"))
      .slice(-6)
  ).toEqual([
    ["/support-tickets", "Page précédente"],
    ["/support-tickets", "Page 1"],
    ["/support-tickets?page=3", "Page 3"],
    ["/support-tickets", "Page 1"],
    ["/support-tickets?page=3", "Page 3"],
    ["/support-tickets?page=3", "Page suivante"],
  ])
})

test("the pages keep the filters set in their address", () => {
  const html = render(
    pageOf({ page: 1, pages: 3 }, { kind: "rp-request", sort: "oldest" })
  )

  expect(linksOf(html)).toContainEqual([
    "/support-tickets?kind=rp-request&amp;sort=oldest&amp;page=2",
    "Page 2",
  ])
})

test("a page whose messages hold no archive says so, and keeps the navigation to the others", () => {
  const html = render(
    pageOf({ archives: [], page: 2, pages: 3, first: 26, last: 50, total: 75 })
  )

  expect(text(html)).toContain("Aucune archive de ticket à afficher.")
  expect(html).not.toContain("aria-labelledby")
  expect(html).toContain('aria-label="Pages des archives"')
})

test("archives that Discord's search does not reach in full say how many it reaches", () => {
  const html = render(
    pageOf({ page: 400, pages: 400, total: 10_001, complete: false })
  )

  expect(archivesFooter(html)).toContain(
    "Discord ne permet de lire que les 10 000 archives les plus récentes : les plus anciennes ne s’affichent pas."
  )
})

test("archives that Discord's search reaches in full say nothing of what was not read", () => {
  expect(text(render(pageOf()))).not.toContain("Discord ne permet")
})

test("the limit says which archives are read when the oldest come first, and that it concerns the search when filters are set", () => {
  const html = render(
    pageOf({ complete: false }, { kind: "other-request", sort: "oldest" })
  )

  expect(archivesFooter(html)).toContain(
    "Discord ne permet de lire que les 10 000 archives les plus anciennes de cette recherche : les plus récentes ne s’affichent pas."
  )
})

test("a window that is not read in full says how many archives it reads and in which direction", () => {
  expect(
    archivesFooter(
      render(pageOf({ complete: false, limit: "window" }, { opener: "ald" }))
    )
  ).toContain(
    "Seules les 100 archives les plus récentes de cette recherche ont été lues : les plus anciennes ne s’affichent pas. Précise un filtre ou une période pour les atteindre."
  )
  expect(
    archivesFooter(
      render(
        pageOf(
          { complete: false, limit: "window" },
          { from: "2026-10-01", on: "opened" }
        )
      )
    )
  ).toContain(
    "Seules les 100 archives les plus anciennes de cette recherche ont été lues : les plus récentes ne s’affichent pas."
  )
})

test("filters that keep no archive say so, and offer to reset them", () => {
  const html = render(
    pageOf(
      { archives: [], first: 0, last: 0, total: 0 },
      { reason: "introuvable" }
    )
  )

  expect(text(html)).toContain("Aucune archive ne correspond à ces filtres.")
  expect(text(html)).not.toContain("Aucune archive de ticket à afficher.")
  expect(
    linksOf(html).filter(([, label]) => label === "Réinitialiser")
  ).toEqual([
    ["/support-tickets", "Réinitialiser"],
    ["/support-tickets", "Réinitialiser"],
  ])
})

test("a name that no account has says which filter looked for it and how to find an account that left", () => {
  const html = render(
    pageOf(
      {
        archives: [],
        first: 0,
        last: 0,
        total: 0,
        accountNotice: { filter: "closer", text: "zzz", kind: "none" },
      },
      { closer: "zzz" }
    )
  )

  expect(text(html)).toContain(
    "Aucun membre ni compte banni ne commence par « zzz » (fermeur) : un compte parti du serveur se cherche par son ID ou sa mention."
  )
})

test("a name that several accounts have asks for a more precise one", () => {
  const html = render(
    pageOf(
      {
        archives: [],
        first: 0,
        last: 0,
        total: 0,
        accountNotice: { filter: "opener", text: "ly", kind: "several" },
      },
      { opener: "ly" }
    )
  )

  expect(text(html)).toContain(
    "Plusieurs comptes commencent par « ly » (ouvreur) : précise le nom, ou colle l’ID ou la mention du compte."
  )
})

async function prerendered(read: TicketArchivePage, counts: KindCounts | null) {
  const { prelude } = await prerender(
    <SupportTicketArchives
      read={read}
      counts={Promise.resolve(counts)}
      opensModeration={false}
    />,
    { progressiveChunkSize: Number.POSITIVE_INFINITY }
  )
  return await new Response(prelude).text()
}

function pills(html: string) {
  const nav = /<nav aria-label="Filtrer par type de demande">(.*?)<\/nav>/.exec(
    html
  )
  return Array.from(
    (nav?.[1] ?? "").matchAll(/<li[^>]*>(.*?)<\/li>/g),
    ([, item]) => text(item ?? "")
  )
}

test("the pills are shown at once, with no number, while the counts are not known", () => {
  expect(pills(render(pageOf()))).toEqual([
    "Tout",
    "🔧 Problème technique",
    "🚨 Signaler un joueur",
    "🎭 Demande RP",
    "❓ Autre demande",
  ])
})

test("the counts, once they come, join the pills of the kinds, and not « Tout »", async () => {
  const html = await prerendered(pageOf(), COUNTS)

  expect(pills(html)).toEqual([
    "Tout",
    "🔧 Problème technique1 234" + "1 234 archives",
    "🚨 Signaler un joueur11 archive",
    "🎭 Demande RP00 archive",
    "❓ Autre demande1212 archives",
  ])
})

test("counts that Discord could not give leave the pills as they are", async () => {
  const html = await prerendered(pageOf(), null)

  expect(pills(html)).toEqual(pills(render(pageOf())))
})
