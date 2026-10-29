import {
  ArrowLeft,
  ArrowRight,
  Ban,
  ExternalLink,
  ShieldBan,
  Timer,
  TimerOff,
  Undo2,
  UserX,
  type LucideIcon,
} from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { SanctionChange } from "@/sanctions/sanction-events"
import { AuditLog } from "./audit-log"
import { AuditLogTypeFilter } from "./audit-log-type-filter"
import type { AuditLogChange, AuditLogPage } from "./read-audit-log"

const ADDITION: AuditLogChange = {
  kind: "rule",
  id: "1563530499194880000",
  date: new Date("2026-10-24T12:32:00.000Z"),
  memberName: "aldis",
  avatarUrl:
    "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000001/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64",
  description: "Ajout de « foo »",
  madeInDiscord: false,
}

const DISCORD_CHANGE: AuditLogChange = {
  kind: "rule",
  id: "1563530499194880001",
  date: new Date("2026-12-01T09:05:00.000Z"),
  memberName: "Bryn la Rouge",
  avatarUrl: null,
  description: "Règle modifiée dans Discord",
  madeInDiscord: true,
}

const TIMEOUT: Extract<AuditLogChange, { kind: "sanction-change" }> = {
  kind: "sanction-change",
  id: "1563530499194880002",
  date: new Date("2026-12-02T10:00:00.000Z"),
  memberName: "aldis",
  avatarUrl: null,
  sanctionChange: {
    kind: "timeout",
    end: new Date("2026-12-02T11:00:00.000Z"),
  },
  account: { id: "1400000000000000003", name: "Lyra" },
  reason: "Insultes répétées",
}

function render(page: Partial<AuditLogPage>, opensModeration = false) {
  const { html, filter } = renderWithFilter(page, opensModeration)
  return html.replace(filter, "")
}

function renderWithFilter(
  page: Partial<AuditLogPage>,
  opensModeration = false
) {
  const wholePage = { type: null, days: [], before: null, older: null, ...page }
  return {
    html: renderToStaticMarkup(
      <AuditLog page={wholePage} opensModeration={opensModeration} />
    ),
    filter: renderToStaticMarkup(<AuditLogTypeFilter type={wholePage.type} />),
  }
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function days(html: string) {
  return Array.from(
    html.matchAll(/<section[^>]*>(.*?)<\/section>/g),
    ([, day = ""]) => ({
      heading: /<h2[^>]*>(.*?)<\/h2>/.exec(day)?.[1],
      times: Array.from(
        day.matchAll(/<li(?:\s[^>]*)?>.*?(<time[^>]*>[^<]*<\/time>).*?<\/li>/g),
        ([, time]) => time
      ),
    })
  )
}

test("a page's changes sit under their day, whose heading gives its weekday, its date and its year, and each shows only its time in Paris, while its dateTime keeps the full moment", () => {
  const html = render({
    days: [
      { date: TIMEOUT.date, changes: [TIMEOUT] },
      { date: DISCORD_CHANGE.date, changes: [DISCORD_CHANGE] },
    ],
  })

  expect(days(html)).toEqual([
    {
      heading: '<time dateTime="2026-12-02">mercredi 2 décembre 2026</time>',
      times: ['<time dateTime="2026-12-02T10:00:00.000Z">11:00</time>'],
    },
    {
      heading: '<time dateTime="2026-12-01">mardi 1 décembre 2026</time>',
      times: ['<time dateTime="2026-12-01T09:05:00.000Z">10:05</time>'],
    },
  ])
})

function lines(row: string) {
  return Array.from(
    row.matchAll(/<p(?:\s[^>]*)?>(.*?)<\/p>/g),
    ([, line]) => line
  )
}

function rows(html: string) {
  return Array.from(
    html.matchAll(/<li(?:\s[^>]*)?>(.*?)<\/li>/g),
    ([, row = ""]) => lines(row)
  )
}

function onOneDay(...changes: AuditLogChange[]) {
  return { days: [{ date: TIMEOUT.date, changes }] }
}

test("a sanction says what changed, then, on one line, the account it targets and its reason, then its staff member", () => {
  expect(rows(render(onOneDay(TIMEOUT)))).toEqual([
    [
      'Exclusion temporaire jusqu’au <time dateTime="2026-12-02T11:00:00.000Z">2 déc. 2026, 12:00</time>',
      "Compte : Lyra · Motif : Insultes répétées",
      "aldis",
    ],
  ])
})

test("a sanction without a reason says it has none", () => {
  expect(
    rows(
      render(
        onOneDay({ ...TIMEOUT, sanctionChange: { kind: "kick" }, reason: null })
      )
    )
  ).toEqual([["Expulsion", "Compte : Lyra · Aucun motif", "aldis"]])
})

test("a change to the blocked words says what changed, then its staff member", () => {
  expect(rows(render(onOneDay(DISCORD_CHANGE, ADDITION)))).toEqual([
    ["Règle modifiée dans Discord", "Bryn la Rouge"],
    ["Ajout de « foo »", "aldis"],
  ])
})

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

test("for a staff member who moderates, a sanction's account links to its record", () => {
  expect(links(render(onOneDay(TIMEOUT), true))).toEqual([
    {
      icon: undefined,
      iconHidden: false,
      text: "Lyra",
      href: "/records/1400000000000000003",
    },
  ])
})

test("for a staff member who does not moderate, a sanction's account links nowhere", () => {
  const html = render(onOneDay(TIMEOUT), false)

  expect(links(html)).toEqual([])
  expect(text(html)).toContain("Compte : Lyra")
})

function icons(html: string) {
  return Array.from(
    html.matchAll(/<li(?:\s[^>]*)?>(.*?)<\/li>/g),
    ([, row = ""]) => {
      const [, attributes = "", icon] =
        /<span([^>]*)><svg[^>]*>(.*?)<\/svg><\/span>/.exec(row) ?? []
      return { icon, hidden: /\saria-hidden="true"/.test(attributes) }
    }
  )
}

function sanction(sanctionChange: SanctionChange): AuditLogChange {
  return { ...TIMEOUT, sanctionChange }
}

test("each change shows the icon of its kind, hidden from assistive technologies, since what changed says the same", () => {
  const html = render(
    onOneDay(
      ADDITION,
      DISCORD_CHANGE,
      TIMEOUT,
      sanction({ kind: "timeout-lift" }),
      sanction({ kind: "kick" }),
      sanction({ kind: "ban" }),
      sanction({ kind: "ban-lift" })
    )
  )

  expect(icons(html)).toEqual(
    [Ban, ExternalLink, Timer, TimerOff, UserX, ShieldBan, Undo2].map(
      (Icon) => ({ icon: drawing(Icon), hidden: true })
    )
  )
})

function staffMembers(html: string) {
  return Array.from(
    html.matchAll(/<li(?:\s[^>]*)?>(.*?)<\/li>/g),
    ([, row = ""]) => {
      const [, attributes = "", avatar = ""] =
        /<span data-slot="avatar"([^>]*)>(.*?)<\/span><\/span>/.exec(row) ?? []
      return {
        name: lines(row).at(-1),
        initials: text(avatar),
        hidden: /\saria-hidden="true"/.test(attributes),
      }
    }
  )
}

test("each change shows its staff member's name beside their initials, hidden from assistive technologies", () => {
  expect(staffMembers(render(onOneDay(DISCORD_CHANGE, ADDITION)))).toEqual([
    { name: "Bryn la Rouge", initials: "BL", hidden: true },
    { name: "aldis", initials: "A", hidden: true },
  ])
})

function until(html: string) {
  return /<p(?:\s[^>]*)?>(Jusqu’au .*?)<\/p>/.exec(html)?.[1]
}

test("a page ends on the day of its oldest change, in Paris", () => {
  const lateAddition = {
    ...ADDITION,
    date: new Date("2026-10-24T22:30:00.000Z"),
  }

  expect(
    until(
      render({
        days: [
          { date: DISCORD_CHANGE.date, changes: [DISCORD_CHANGE] },
          { date: lateAddition.date, changes: [lateAddition] },
        ],
      })
    )
  ).toBe('Jusqu’au <time dateTime="2026-10-25">25 oct. 2026</time>')
})

test("an empty audit log says so in one sentence, with no day and no date it ends on", () => {
  const html = render({})

  expect(text(html)).toBe(
    "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours."
  )
  expect(days(html)).toEqual([])
})

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

test("the newest page links to older changes only, when there are some, after a hidden right arrow", () => {
  expect(links(render(onOneDay(ADDITION)))).toEqual([])
  expect(
    links(render({ ...onOneDay(ADDITION), older: "1563530499194880000" }))
  ).toEqual([olderLink("1563530499194880000")])
})

test("an older page links back to the newest changes after a hidden left arrow, and on to older ones while there are some", () => {
  const older = { ...onOneDay(ADDITION), before: "1563530499194880001" }

  expect(links(render({ ...older, older: "1563530499194880000" }))).toEqual([
    NEWEST_LINK,
    olderLink("1563530499194880000"),
  ])
  expect(links(render(older))).toEqual([NEWEST_LINK])
})

test("an older page with no change says only that none is older, and links back to the newest changes", () => {
  const html = render({ before: "1563530499194880001" })

  expect(text(html)).toBe(
    "Aucun changement plus ancien.Revenir aux plus récents"
  )
  expect(links(html)).toEqual([NEWEST_LINK])
})

test("the audit log opens on the filter of its page's type, before its days", () => {
  const { html, filter } = renderWithFilter({
    ...onOneDay(TIMEOUT),
    type: "timeouts",
  })

  expect(filter).toMatch(/<a[^>]* aria-current="true"[^>]*>Exclusions<\/a>/)
  expect(html.indexOf(filter)).toBeGreaterThan(-1)
  expect(html.indexOf(filter)).toBeLessThan(html.indexOf("<section"))
})

test("an empty page of a type says that no change of that type is as recent as 45 days, and offers « Réinitialiser », which leads to every type", () => {
  const html = render({ type: "kicks" })

  expect(text(html)).toBe(
    "Aucun changement de ce type ces 45 derniers jours.Réinitialiser"
  )
  expect(links(html)).toEqual([
    {
      icon: undefined,
      iconHidden: false,
      text: "Réinitialiser",
      href: "/audit-log",
    },
  ])
  expect(days(html)).toEqual([])
})

test("a type's pages link to the newest and the older changes of that type", () => {
  const older = {
    ...onOneDay(TIMEOUT),
    type: "timeouts",
    before: "1563530499194880001",
    older: "1563530499194880000",
  } as const

  expect(links(render(older))).toEqual([
    { ...NEWEST_LINK, href: "/audit-log?type=timeouts" },
    {
      ...olderLink("1563530499194880000"),
      href: "/audit-log?type=timeouts&before=1563530499194880000",
    },
  ])
})

test("an older page of a type with no change says only that none is older, then offers « Réinitialiser », and links back to that type's newest changes", () => {
  const html = render({ type: "bans", before: "1563530499194880001" })

  expect(text(html)).toBe(
    "Aucun changement plus ancien.RéinitialiserRevenir aux plus récents"
  )
  expect(links(html)).toEqual([
    {
      icon: undefined,
      iconHidden: false,
      text: "Réinitialiser",
      href: "/audit-log",
    },
    { ...NEWEST_LINK, href: "/audit-log?type=bans" },
  ])
})
