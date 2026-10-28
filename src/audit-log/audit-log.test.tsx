import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLog } from "./audit-log"
import type { AuditLogChange, AuditLogPage } from "./read-audit-log"

const ADDITION: AuditLogChange = {
  id: "1563530499194880000",
  date: new Date("2026-10-24T12:32:00.000Z"),
  memberName: "aldis",
  avatarUrl:
    "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000001/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64",
  description: "Ajout de « foo »",
}

const DISCORD_CHANGE: AuditLogChange = {
  id: "1563530499194880001",
  date: new Date("2026-12-01T09:05:00.000Z"),
  memberName: "Bryn la Rouge",
  avatarUrl: null,
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

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function member(cell = "") {
  const [, avatar = "", name] =
    /^<div[^>]*>(.*)<div[^>]*>(.*)<\/div><\/div>$/.exec(cell) ?? []
  return {
    initials: text(avatar),
    hidden: /^<\w+[^>]*\saria-hidden="true"/.test(avatar),
    name,
  }
}

function rows(html: string) {
  return cells(html, "td").map(([date, cell, change]) => [
    date,
    member(cell).name,
    change,
  ])
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function links(html: string) {
  return Array.from(
    html.matchAll(
      /<a[^>]* href="([^"]*)"[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/a>/g
    ),
    ([, href, iconAttributes = "", iconDrawing, text]) => ({
      icon: iconDrawing,
      iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      text,
      href: href?.replaceAll("&amp;", "&"),
    })
  )
}

const NEWEST_LINK = {
  icon: drawing(ArrowLeft),
  iconHidden: true,
  text: "Revenir aux plus récents",
  href: "/audit-log",
}

function olderLink(cursor: string) {
  return {
    icon: drawing(ArrowRight),
    iconHidden: true,
    text: "Plus anciens",
    href: `/audit-log?before=${cursor}`,
  }
}

test("each change is a row of its date in Paris time, its staff member and what changed, under three headers", () => {
  const html = render({ changes: [DISCORD_CHANGE, ADDITION] })

  expect(cells(html, "th")).toEqual([["Date", "Membre du staff", "Changement"]])
  expect(rows(html)).toEqual([
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

test("each change shows its staff member's initials, hidden from assistive technologies, before their name", () => {
  const html = render({ changes: [DISCORD_CHANGE, ADDITION] })

  expect(cells(html, "td").map(([, cell]) => member(cell))).toEqual([
    { initials: "BL", hidden: true, name: "Bryn la Rouge" },
    { initials: "A", hidden: true, name: "aldis" },
  ])
})

test("an empty audit log says so in one sentence, with no table", () => {
  const html = render({})

  expect(html).toContain(
    "<p>Aucun changement des mots interdits ces 45 derniers jours.</p>"
  )
  expect(html).not.toContain("<table")
})

test("the newest page links to older changes only, when there are some, after a hidden right arrow", () => {
  expect(links(render({ changes: [ADDITION] }))).toEqual([])
  expect(
    links(render({ changes: [ADDITION], older: "1563530499194880000" }))
  ).toEqual([olderLink("1563530499194880000")])
})

test("an older page links back to the newest changes after a hidden left arrow, and on to older ones while there are some", () => {
  const older = {
    changes: [ADDITION],
    before: "1563530499194880001",
  }

  expect(links(render({ ...older, older: "1563530499194880000" }))).toEqual([
    NEWEST_LINK,
    olderLink("1563530499194880000"),
  ])
  expect(links(render(older))).toEqual([NEWEST_LINK])
})

test("an older page with no change says only that none is older, and links back to the newest changes", () => {
  const html = render({ before: "1563530499194880001" })

  expect(html).toContain("<p>Aucun changement plus ancien.</p>")
  expect(html).not.toContain("45 derniers jours")
  expect(links(html)).toEqual([NEWEST_LINK])
})
