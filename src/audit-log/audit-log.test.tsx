import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLog } from "./audit-log"
import type { AuditLogChange, AuditLogPage } from "./read-audit-log"

const ADDITION: AuditLogChange = {
  id: "1563530499194880000",
  date: new Date("2026-10-24T12:32:00.000Z"),
  memberName: "aldis",
  description: "Ajout de « foo »",
}

const DISCORD_CHANGE: AuditLogChange = {
  id: "1563530499194880001",
  date: new Date("2026-12-01T09:05:00.000Z"),
  memberName: "Bryn la Rouge",
  description: "Règle modifiée dans Discord",
}

function render(page: Partial<AuditLogPage>) {
  return renderToStaticMarkup(
    <AuditLog page={{ changes: [], before: null, older: null, ...page }} />
  )
}

function cells(html: string, tag: "th" | "td") {
  return Array.from(html.matchAll(/<tr[^>]*>(.*?)<\/tr>/g), ([, row = ""]) =>
    Array.from(
      row.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "g")),
      ([, cell]) => cell
    )
  ).filter((row) => row.length > 0)
}

function links(html: string) {
  return Array.from(
    html.matchAll(/<a[^>]* href="([^"]*)"[^>]*>(.*?)<\/a>/g),
    ([, href, text]) => ({ text, href: href?.replaceAll("&amp;", "&") })
  )
}

test("each change is a row of its date in Paris time, its staff member and what changed, under three headers", () => {
  const html = render({ changes: [DISCORD_CHANGE, ADDITION] })

  expect(cells(html, "th")).toEqual([["Date", "Membre du staff", "Changement"]])
  expect(cells(html, "td")).toEqual([
    [
      '<time dateTime="2026-12-01T09:05:00.000Z">1 déc. 2026, 10:05</time>',
      "Bryn la Rouge",
      "Règle modifiée dans Discord",
    ],
    [
      '<time dateTime="2026-10-24T12:32:00.000Z">24 oct. 2026, 14:32</time>',
      "aldis",
      "Ajout de « foo »",
    ],
  ])
})

test("an empty audit log says so in one sentence, with no table", () => {
  const html = render({})

  expect(html).toContain(
    "<p>Aucun changement des mots interdits ces 45 derniers jours.</p>"
  )
  expect(html).not.toContain("<table")
})

test("the newest page links to older changes only, when there are some", () => {
  expect(links(render({ changes: [ADDITION] }))).toEqual([])
  expect(
    links(render({ changes: [ADDITION], older: "1563530499194880000" }))
  ).toEqual([
    { text: "Plus anciens", href: "/audit-log?before=1563530499194880000" },
  ])
})

test("an older page links back to the newest changes, and on to older ones while there are some", () => {
  const older = {
    changes: [ADDITION],
    before: "1563530499194880001",
  }

  expect(links(render({ ...older, older: "1563530499194880000" }))).toEqual([
    { text: "Revenir aux plus récents", href: "/audit-log" },
    { text: "Plus anciens", href: "/audit-log?before=1563530499194880000" },
  ])
  expect(links(render(older))).toEqual([
    { text: "Revenir aux plus récents", href: "/audit-log" },
  ])
})

test("an older page with no change says only that none is older, and links back to the newest changes", () => {
  const html = render({ before: "1563530499194880001" })

  expect(html).toContain("<p>Aucun changement plus ancien.</p>")
  expect(html).not.toContain("45 derniers jours")
  expect(links(html)).toEqual([
    { text: "Revenir aux plus récents", href: "/audit-log" },
  ])
})
