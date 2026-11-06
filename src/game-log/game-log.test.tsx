import {
  CircleHelp,
  Gamepad2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { GameLog } from "./game-log"
import { NO_FILTERS } from "./game-log-filters"
import type { GameLogDay, GameLogPage } from "./read-game-log"

const GUILD_ID = "1100000000000000000"

const CHANNEL_ID = "1552824453153423520"

const HEAL: GameLogDay["entries"][number] = {
  kind: "event",
  messageId: "1568100000000000001",
  channelId: CHANNEL_ID,
  date: new Date("2026-11-03T08:12:00.000Z"),
  category: "Administration",
  action: "administration:heal",
  character: "Merida",
  gameAccount: "2094594320",
  target: "4278190080",
  reason: null,
  place: "3c:Skyrim.esm · 3816, -5303, -5681",
  eventId: "189b92f6",
  extra: [],
}

const DISCONNECT: GameLogDay["entries"][number] = {
  kind: "event",
  messageId: "1568100000000000002",
  channelId: CHANNEL_ID,
  date: new Date("2026-11-03T07:00:00.000Z"),
  category: "Personnages",
  action: "character:disconnect",
  character: null,
  gameAccount: "2094594321",
  target: null,
  reason: "Déconnexion",
  place: null,
  eventId: null,
  extra: [],
}

const RAW: GameLogDay["entries"][number] = {
  kind: "raw",
  messageId: "1568100000000000003",
  channelId: CHANNEL_ID,
  date: new Date("2026-11-02T22:30:00.000Z"),
  title: "Serveur redémarré",
  fields: [
    { name: null, value: "Redémarrage planifié" },
    { name: "Durée", value: "12 s" },
  ],
}

function render(page: Partial<GameLogPage>) {
  const wholePage: GameLogPage = {
    ...NO_FILTERS,
    days: [],
    before: null,
    older: null,
    cut: false,
    ...page,
  }
  return renderToStaticMarkup(
    <GameLog read={{ kind: "page", ...wholePage }} guildId={GUILD_ID} />
  ).replace(/\s(?:id|aria-controls)="[^"]*"/g, "")
}

test("a game log left out of the configuration shows its message in place of a page", () => {
  const html = renderToStaticMarkup(
    <GameLog read={{ kind: "unconfigured" }} guildId={GUILD_ID} />
  )

  expect(textOf(html)).toBe(
    "Le journal du jeu n’est pas configuré pour ce serveur Discord."
  )
})

function textOf(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function rowsOf(html: string) {
  return Array.from(
    html.matchAll(/<li class="[^"]*">(.*?)<\/li>/g),
    ([, row = ""]) => row
  )
}

test("a line in format shows its time, its category and action, its character and game account, its target, its place and its identifier", () => {
  const html = render({
    days: [{ date: HEAL.date, entries: [HEAL] }],
  })

  const [row = ""] = rowsOf(html)
  expect(textOf(row)).toContain("09:12")
  expect(textOf(row)).toContain("Administration · administration:heal")
  expect(textOf(row)).toContain("Merida · compte 2094594320")
  expect(textOf(row)).toContain("Cible : 4278190080")
  expect(textOf(row)).toContain("Lieu : 3c:Skyrim.esm · 3816, -5303, -5681")
  expect(textOf(row)).toContain("Identifiant : 189b92f6")
  expect(textOf(row)).not.toContain("Motif")
})

function tileDrawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function tileOf(entry: GameLogDay["entries"][number]) {
  const [row = ""] = rowsOf(
    render({ days: [{ date: entry.date, entries: [entry] }] })
  )
  return /<span[^>]*aria-hidden="true"[^>]*><svg[^>]*>(.*?)<\/svg><\/span>/.exec(
    row
  )?.[1]
}

test("a line's tile draws the icon of its category, whatever the case of its title, the generic one for any other category and the unknown one for a raw line", () => {
  expect(tileOf(HEAL)).toBe(tileDrawing(ShieldCheck))
  expect(tileOf({ ...HEAL, category: "ADMINISTRATION" })).toBe(
    tileDrawing(ShieldCheck)
  )
  expect(tileOf(DISCONNECT)).toBe(tileDrawing(UserRound))
  expect(tileOf({ ...HEAL, category: "Serveur" })).toBe(tileDrawing(Gamepad2))
  expect(tileOf(RAW)).toBe(tileDrawing(CircleHelp))
})

test("a line with a reason shows it beside the target, and one without character shows its game account alone", () => {
  const html = render({
    days: [{ date: DISCONNECT.date, entries: [DISCONNECT] }],
  })

  const [row = ""] = rowsOf(html)
  expect(textOf(row)).toContain("compte 2094594321")
  expect(textOf(row)).not.toContain("·  compte")
  expect(textOf(row)).toContain("Motif : Déconnexion")
  expect(textOf(row)).not.toContain("Cible")
  expect(textOf(row)).not.toContain("Lieu")
  expect(textOf(row)).not.toContain("Identifiant")
})

test("what a line in format holds beyond what the page reads shows raw under the event, a field as its name and its value", () => {
  const html = render({
    days: [
      {
        date: HEAL.date,
        entries: [
          {
            ...HEAL,
            extra: [
              { name: null, value: "Une remarque libre" },
              { name: "Extra", value: "zzz" },
            ],
          },
        ],
      },
    ],
  })

  const [row = ""] = rowsOf(html)
  expect(textOf(row)).toContain("Identifiant : 189b92f6")
  expect(textOf(row)).toContain("Une remarque libre")
  expect(textOf(row)).toContain("Extra : zzz")
})

test("a line's game account is a number, not a link", () => {
  const html = render({
    days: [{ date: HEAL.date, entries: [HEAL] }],
  })

  const [row = ""] = rowsOf(html)
  expect(row.match(/<a /g)).toHaveLength(1)
})

test("each line links to its message on Discord, in a new tab", () => {
  const html = render({
    days: [{ date: HEAL.date, entries: [HEAL, DISCONNECT] }],
  })

  const links = Array.from(
    rowsOf(html)
      .join("")
      .matchAll(/<a ([^>]*)>(.*?)<\/a>/g),
    ([, attributes = "", content = ""]) => ({
      href: /href="([^"]*)"/.exec(attributes)?.[1],
      target: /target="([^"]*)"/.exec(attributes)?.[1],
      rel: /rel="([^"]*)"/.exec(attributes)?.[1],
      text: textOf(content),
    })
  )
  expect(links).toEqual([
    {
      href: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/1568100000000000001`,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "Voir dans Discord",
    },
    {
      href: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/1568100000000000002`,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "Voir dans Discord",
    },
  ])
})

test("a line out of format shows its title, then each field as it was written, and still links to Discord", () => {
  const html = render({
    days: [{ date: RAW.date, entries: [RAW] }],
  })

  const [row = ""] = rowsOf(html)
  expect(textOf(row)).toContain("Serveur redémarré")
  expect(textOf(row)).toContain("Redémarrage planifié")
  expect(textOf(row)).toContain("Durée : 12 s")
  expect(textOf(row)).toContain("Voir dans Discord")
})

test("the lines are grouped under the day of Paris, newest first", () => {
  const html = render({
    days: [
      { date: HEAL.date, entries: [HEAL, DISCONNECT] },
      { date: RAW.date, entries: [RAW] },
    ],
  })

  expect(
    Array.from(html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g), ([, day = ""]) =>
      textOf(day)
    )
  ).toEqual(["mardi 3 novembre 2026", "lundi 2 novembre 2026"])
})

test("an empty log says so, with no way back on the newest page", () => {
  const html = render({})

  expect(textOf(html)).toContain(
    "Aucune ligne dans le journal du jeu pour l’instant."
  )
  expect(html).not.toContain("Réinitialiser")
})

test("a text that finds nothing says so and offers to reset the filters, under the pills and in the empty frame", () => {
  const html = render({ text: "zzz" })

  expect(textOf(html)).toContain(
    "Aucune ligne du journal du jeu ne correspond à ces filtres."
  )
  expect(
    Array.from(
      html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>Réinitialiser<\/a>/g),
      ([, href]) => href
    )
  ).toEqual(["/game-log", "/game-log"])
})

test("the page opens on the pills of the categories, « Tout » the current one, and the filters' form under them", () => {
  const html = render({})

  expect(html).toContain('<nav aria-label="Filtrer par catégorie">')
  expect(
    Array.from(
      html.matchAll(/<nav aria-label="Filtrer par catégorie">.*?<\/nav>/g)
    ).map(([nav]) => textOf(nav))
  ).toEqual(["ToutAdministrationPersonnages"])
  expect(html.indexOf("Filtrer par catégorie")).toBeLessThan(
    html.indexOf('action="/game-log"')
  )
})

test("a category chosen is the current pill, and a category that no line holds says so", () => {
  const html = render({ category: "characters" })

  expect(html).toMatch(/<a[^>]*aria-current="true"[^>]*>Personnages<\/a>/)
  expect(textOf(html)).toContain(
    "Aucune ligne du journal du jeu ne correspond à ces filtres."
  )
})

test("a page cut before it was full says how much was read, and leads on", () => {
  const html = render({
    cut: true,
    older: "1568100000000000000",
    days: [{ date: HEAL.date, entries: [HEAL] }],
  })

  expect(textOf(html)).toContain(
    "Les 100 messages suivants du salon ont été lus, ce qui ne remplit pas la page : « Plus anciens » continue la lecture."
  )
  expect(html).toContain("Plus anciens")
})

test("a cut page with no line says that none of the messages read matches, and still leads on", () => {
  const html = render({
    cut: true,
    action: "heal",
    older: "1568100000000000000",
  })

  expect(textOf(html)).toContain(
    "Aucune ligne ne correspond aux filtres parmi les 100 messages suivants du salon : « Plus anciens » continue la lecture."
  )
  expect(html).toContain("Plus anciens")
})

test("an empty page past the newest says nothing is older, whatever the filters", () => {
  const html = render({ text: "zzz", before: "1568100000000000000" })

  expect(textOf(html)).toContain("Aucune ligne plus ancienne.")
})

test("the pagination links to the older lines by the ID of the last one, keeping the filters, then back to the newest", () => {
  const html = render({
    text: "heal",
    days: [{ date: HEAL.date, entries: [HEAL] }],
    older: HEAL.messageId,
  })
  const newestPage = render({
    text: "heal",
    days: [{ date: HEAL.date, entries: [HEAL] }],
    before: "1568100000000000009",
  })

  expect(html).toContain(
    'href="/game-log?text=heal&amp;before=1568100000000000001"'
  )
  expect(html).not.toContain("Revenir aux plus récents")
  expect(newestPage).toContain('href="/game-log?text=heal"')
  expect(textOf(newestPage)).toContain("Revenir aux plus récents")
  expect(textOf(html)).toContain("Jusqu’au 3 nov. 2026")
})
