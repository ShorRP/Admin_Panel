import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { SanctionHistory } from "./sanction-history"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function items(html: string) {
  return Array.from(html.matchAll(/<li[^>]*>(.*?)<\/li>/g), ([, item]) =>
    text(item ?? "")
  )
}

test("an ID that names no account shows no history", () => {
  expect(renderToStaticMarkup(<SanctionHistory history={null} />)).toBe("")
})

test("an account with no sanction says so, and says once that Discord keeps 45 days", () => {
  const html = renderToStaticMarkup(<SanctionHistory history={[]} />)

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe(
    "Historique des sanctions"
  )
  expect(text(html)).toBe(
    "Historique des sanctionsDiscord ne garde l’historique que 45 jours.Aucune sanction ni levée dans l’historique."
  )
})

test("each sanction and each lifting says what, when, who, from where, and why", () => {
  const html = renderToStaticMarkup(
    <SanctionHistory
      history={[
        {
          id: "1500000000000000006",
          date: new Date("2026-10-28T13:20:00.000Z"),
          change: { kind: "ban-lift" },
          author: { kind: "discord", memberName: "Bryn la Rouge" },
          reason: null,
        },
        {
          id: "1500000000000000005",
          date: new Date("2026-10-28T13:10:00.000Z"),
          change: { kind: "ban" },
          author: { kind: "panel", staffMemberName: "Aldis" },
          reason: "Menaces",
        },
        {
          id: "1500000000000000004",
          date: new Date("2026-10-28T13:00:00.000Z"),
          change: { kind: "kick" },
          author: { kind: "discord", memberName: "Bryn la Rouge" },
          reason: "Provocations",
        },
        {
          id: "1500000000000000003",
          date: new Date("2026-10-27T09:00:00.000Z"),
          change: { kind: "timeout-lift" },
          author: { kind: "panel", staffMemberName: "Aldis" },
          reason: "Erreur de cible",
        },
        {
          id: "1500000000000000002",
          date: new Date("2026-10-27T08:00:00.000Z"),
          change: {
            kind: "timeout",
            end: new Date("2026-10-27T09:00:00.000Z"),
          },
          author: { kind: "panel", staffMemberName: "Aldis" },
          reason: "Insultes répétées",
        },
        {
          id: "1500000000000000001",
          date: new Date("2026-10-26T20:00:00.000Z"),
          change: { kind: "timeout", end: null },
          author: { kind: "auto-moderation", ruleName: "Insultes" },
          reason: null,
        },
      ]}
    />
  )

  expect(items(html)).toEqual([
    "Levée du bannissementLe 28 oct. 2026, 14:20, par Bryn la Rouge, dans DiscordAucun motif",
    "BannissementLe 28 oct. 2026, 14:10, par Aldis, depuis le panelMotif : Menaces",
    "ExpulsionLe 28 oct. 2026, 14:00, par Bryn la Rouge, dans DiscordMotif : Provocations",
    "Levée de l’exclusion temporaireLe 27 oct. 2026, 10:00, par Aldis, depuis le panelMotif : Erreur de cible",
    "Exclusion temporaire jusqu’au 27 oct. 2026, 10:00Le 27 oct. 2026, 09:00, par Aldis, depuis le panelMotif : Insultes répétées",
    "Exclusion temporaireLe 26 oct. 2026, 21:00, par AutoMod, règle « Insultes »",
  ])
  expect(html).toContain('<time dateTime="2026-10-28T13:20:00.000Z">')
})

test("each entry of the timeline carries its line and its diamond, both hidden from assistive technologies", () => {
  const html = renderToStaticMarkup(
    <SanctionHistory
      history={[
        { kind: "ban-lift" } as const,
        { kind: "ban" } as const,
        { kind: "kick" } as const,
        { kind: "timeout-lift" } as const,
        { kind: "timeout", end: null } as const,
      ].map((change, index) => ({
        id: `150000000000000000${index}`,
        date: new Date("2026-10-28T13:00:00.000Z"),
        change,
        author: { kind: "panel", staffMemberName: "Aldis" } as const,
        reason: null,
      }))}
    />
  )

  expect(
    Array.from(
      html.matchAll(/<li[^>]*>(.*?)<\/li>/g),
      ([, item = ""]) =>
        item.match(/<span aria-hidden="true"[^>]*><\/span>/g)?.length
    )
  ).toEqual([2, 2, 2, 2, 2])
})
