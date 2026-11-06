import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BotLog } from "./bot-log"
import { NO_FILTERS } from "./bot-log-filters"
import type { BotLogEvent, BotLogRawLine } from "./parse-bot-log-message"
import type { BotLogPage } from "./read-bot-log"

const GUILD_ID = "1100000000000000000"

const CHANNEL_ID = "1550837163464327289"

const CLOSED: BotLogEvent = {
  kind: "event",
  messageId: "1568100000000000001",
  channelId: CHANNEL_ID,
  date: new Date("2026-11-03T08:12:00.000Z"),
  family: "tickets",
  action: "Ticket fermé",
  fields: [
    {
      name: "Type de demande",
      parts: [{ kind: "text", text: "🔧 Problème technique" }],
    },
    {
      name: "Ouvert par",
      parts: [{ kind: "account", id: "1400000000000000001", name: "Aldis" }],
    },
    {
      name: "Salon",
      parts: [{ kind: "channel", id: "1400000000000000020", name: null }],
    },
    {
      name: "Fermé par",
      parts: [{ kind: "account", id: "1400000000000000002", name: null }],
    },
    { name: "Motif", parts: [{ kind: "text", text: "Problème résolu" }] },
  ],
  extra: [],
}

const GIVEN: BotLogEvent = {
  kind: "event",
  messageId: "1568100000000000002",
  channelId: CHANNEL_ID,
  date: new Date("2026-11-03T07:00:00.000Z"),
  family: "rules",
  action: "Rôle Membre donné",
  fields: [
    {
      name: "Membre",
      parts: [{ kind: "account", id: "1400000000000000001", name: "Aldis" }],
    },
    {
      name: "Rôle",
      parts: [{ kind: "role", id: "1400000000000000010", name: "Membre" }],
    },
    { name: "Déclencheur", parts: [{ kind: "text", text: "Réaction ✅" }] },
  ],
  extra: [],
}

const VOICE: BotLogEvent = {
  kind: "event",
  messageId: "1568100000000000004",
  channelId: CHANNEL_ID,
  date: new Date("2026-11-03T06:00:00.000Z"),
  family: "voice-channels",
  action: "Vocal créé",
  fields: [
    {
      name: "Salon",
      parts: [
        { kind: "channel", id: "1400000000000000021", name: "salon de Lyra" },
      ],
    },
  ],
  extra: [{ name: null, value: "Texte en plus" }],
}

const RAW: BotLogRawLine = {
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

function render(page: Partial<BotLogPage>, opensModeration = false) {
  const wholePage: BotLogPage = {
    ...NO_FILTERS,
    days: [],
    before: null,
    older: null,
    cut: false,
    notice: null,
    ...page,
  }
  return renderToStaticMarkup(
    <BotLog
      read={{ kind: "page", ...wholePage }}
      guildId={GUILD_ID}
      opensModeration={opensModeration}
    />
  ).replace(/\s(?:id|aria-controls)="[^"]*"/g, "")
}

function textOf(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function rowsOf(html: string) {
  return Array.from(
    html.matchAll(/<li class="[^"]*">(.*?)<\/li>/g),
    ([, row = ""]) => row
  )
}

test("a Bot log left out of the configuration shows its message in place of a page", () => {
  const html = renderToStaticMarkup(
    <BotLog
      read={{ kind: "unconfigured" }}
      guildId={GUILD_ID}
      opensModeration={false}
    />
  )

  expect(textOf(html)).toBe(
    "Le Journal du Bot n’est pas configuré pour ce serveur Discord."
  )
})

test("a line shows its time, its family and its action, then its fields, each with its name", () => {
  const html = render({ days: [{ date: GIVEN.date, entries: [GIVEN] }] })

  const [row = ""] = rowsOf(html)
  expect(textOf(row)).toContain("08:00")
  expect(textOf(row)).toContain("Règlement · Rôle Membre donné")
  expect(textOf(row)).toContain(
    "Membre : Aldis · Rôle : Membre · Déclencheur : Réaction ✅"
  )
})

test("a mention shows the name Discord gave it, a channel with its #, and the ID when the name is unknown", () => {
  const html = render({
    days: [{ date: CLOSED.date, entries: [CLOSED, VOICE] }],
  })

  const [closed = "", voice = ""] = rowsOf(html)
  expect(textOf(closed)).toContain("Ouvert par : Aldis")
  expect(textOf(closed)).toContain("Salon : 1400000000000000020")
  expect(textOf(closed)).toContain("Fermé par : 1400000000000000002")
  expect(textOf(voice)).toContain("Salon : #salon de Lyra")
})

test("what an event holds beyond its fields shows under it", () => {
  const html = render({ days: [{ date: VOICE.date, entries: [VOICE] }] })

  expect(textOf(rowsOf(html)[0] ?? "")).toContain("Texte en plus")
})

test("an event with no field shows its title alone", () => {
  const html = render({
    days: [
      {
        date: VOICE.date,
        entries: [{ ...VOICE, fields: [], extra: [] }],
      },
    ],
  })

  expect(textOf(rowsOf(html)[0] ?? "")).toContain("Vocaux · Vocal créé")
  expect(rowsOf(html)[0]?.match(/<p /g)).toHaveLength(1)
})

test("a staff member who moderates finds each account a link to its record, and the others plain text", () => {
  const moderator = render(
    { days: [{ date: CLOSED.date, entries: [CLOSED] }] },
    true
  )
  const others = render({ days: [{ date: CLOSED.date, entries: [CLOSED] }] })

  const recordLinks = (html: string) =>
    Array.from(
      html.matchAll(/<a [^>]*href="(\/records\/[^"]*)"[^>]*>(.*?)<\/a>/g),
      ([, href, text]) => ({ href, text })
    )
  expect(recordLinks(moderator)).toEqual([
    { href: "/records/1400000000000000001", text: "Aldis" },
    { href: "/records/1400000000000000002", text: "1400000000000000002" },
  ])
  expect(recordLinks(others)).toEqual([])
  expect(textOf(others)).toContain("Ouvert par : Aldis")
})

test("a channel or a role is never a link to a record, whoever looks", () => {
  const html = render(
    { days: [{ date: GIVEN.date, entries: [GIVEN, VOICE] }] },
    true
  )

  expect(html.match(/href="\/records\/[^"]*"/g)).toHaveLength(1)
})

test("a line out of format shows its title, then each text as it was written, and still links to Discord", () => {
  const html = render({ days: [{ date: RAW.date, entries: [RAW] }] })

  const [row = ""] = rowsOf(html)
  expect(textOf(row)).toContain("Serveur redémarré")
  expect(textOf(row)).toContain("Redémarrage planifié")
  expect(textOf(row)).toContain("Durée : 12 s")
  expect(textOf(row)).toContain("Voir dans Discord")
})

test("each line links to its message on Discord, in a new tab", () => {
  const html = render({
    days: [{ date: CLOSED.date, entries: [CLOSED, GIVEN] }],
  })

  const links = Array.from(
    html.matchAll(/<a ([^>]*)>(Voir dans Discord)/g),
    ([, attributes = ""]) => ({
      href: /href="([^"]*)"/.exec(attributes)?.[1],
      target: /target="([^"]*)"/.exec(attributes)?.[1],
      rel: /rel="([^"]*)"/.exec(attributes)?.[1],
    })
  )
  expect(links).toEqual(
    ["1568100000000000001", "1568100000000000002"].map((messageId) => ({
      href: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/${messageId}`,
      target: "_blank",
      rel: "noopener noreferrer",
    }))
  )
})

test("the lines are grouped under the day of Paris, newest first", () => {
  const html = render({
    days: [
      { date: CLOSED.date, entries: [CLOSED, GIVEN] },
      { date: RAW.date, entries: [RAW] },
    ],
  })

  expect(
    Array.from(html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g), ([, day = ""]) =>
      textOf(day)
    )
  ).toEqual(["mardi 3 novembre 2026", "lundi 2 novembre 2026"])
})

test("the family pills come first, « Tout » current with no family chosen", () => {
  const html = render({})

  const pills = Array.from(
    html.matchAll(/<li><a ([^>]*)>(.*?)<\/a><\/li>/g),
    ([, attributes = "", text]) => ({
      text,
      href: /href="([^"]*)"/.exec(attributes)?.[1],
      current: /aria-current="([^"]*)"/.exec(attributes)?.[1],
    })
  )
  expect(pills).toEqual([
    { text: "Tout", href: "/bot-log", current: "true" },
    { text: "Règlement", href: "/bot-log?family=rules", current: undefined },
    {
      text: "Vocaux",
      href: "/bot-log?family=voice-channels",
      current: undefined,
    },
    { text: "Tickets", href: "/bot-log?family=tickets", current: undefined },
    {
      text: "Serveurs de jeu",
      href: "/bot-log?family=game-servers",
      current: undefined,
    },
    {
      text: "Sanctions automatiques",
      href: "/bot-log?family=automatic-sanctions",
      current: undefined,
    },
  ])
})

test("a pill keeps the other filters and drops the cursor, and the family chosen is current", () => {
  const html = render({
    family: "tickets",
    account: "lyra",
    before: "1568100000000000009",
    days: [{ date: CLOSED.date, entries: [CLOSED] }],
  })

  expect(html).toContain(
    'href="/bot-log?family=voice-channels&amp;account=lyra"'
  )
  expect(html).toMatch(/<a [^>]*aria-current="true"[^>]*>Tickets<\/a>/)
})

test("an empty log says so, with no way back on the newest page", () => {
  const html = render({})

  expect(textOf(html)).toContain(
    "Aucune ligne dans le Journal du Bot pour l’instant."
  )
  expect(html).not.toContain(">Réinitialiser<")
})

test("filters that find nothing say so and offer to reset them", () => {
  const html = render({ text: "zzz" })

  expect(textOf(html)).toContain(
    "Aucune ligne du Journal du Bot ne correspond à ces filtres."
  )
  expect(
    Array.from(
      html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>Réinitialiser<\/a>/g),
      ([, href]) => href
    )
  ).toContain("/bot-log")
})

test.each([
  [
    { filter: "account", text: "zzz", kind: "none" },
    "Aucun membre ni compte banni ne commence par « zzz » (compte) : un compte parti du serveur se cherche par son ID ou sa mention.",
  ],
  [
    { filter: "account", text: "ly", kind: "several" },
    "Plusieurs comptes commencent par « ly » (compte) : précise le nom, ou colle l’ID ou la mention du compte.",
  ],
  [
    { filter: "channel", text: "zzz", kind: "none" },
    "Aucun salon que tu vois ne contient « zzz » (salon) : un salon supprimé se cherche par son ID ou sa mention.",
  ],
  [
    { filter: "channel", text: "tic", kind: "several" },
    "Plusieurs salons contiennent « tic » (salon) : précise le nom, ou colle l’ID ou la mention du salon.",
  ],
] as const)(
  "a name that finds no account or channel, or several, says so (%j)",
  (notice, sentence) => {
    const html = render({ notice })

    expect(textOf(html)).toContain(sentence)
    expect(html).toContain(">Réinitialiser<")
  }
)

test("an empty page past the newest says nothing is older, whatever the filters", () => {
  const html = render({ text: "zzz", before: "1568100000000000000" })

  expect(textOf(html)).toContain("Aucune ligne plus ancienne.")
})

test("a page cut before it was full says how much was read, and leads on", () => {
  const html = render({
    cut: true,
    older: "1568100000000000000",
    days: [{ date: CLOSED.date, entries: [CLOSED] }],
  })

  expect(textOf(html)).toContain(
    "Les 100 messages suivants du salon ont été lus, ce qui ne remplit pas la page : « Plus anciens » continue la lecture."
  )
  expect(html).toContain("Plus anciens")
})

test("a cut page with no line says that none of the messages read matches, and still leads on", () => {
  const html = render({
    cut: true,
    family: "tickets",
    older: "1568100000000000000",
  })

  expect(textOf(html)).toContain(
    "Aucune ligne ne correspond aux filtres parmi les 100 messages suivants du salon : « Plus anciens » continue la lecture."
  )
  expect(html).toContain("Plus anciens")
})

test("the pagination links to the older lines by the ID of the last one, keeping the filters, then back to the newest", () => {
  const html = render({
    text: "résolu",
    days: [{ date: CLOSED.date, entries: [CLOSED] }],
    older: CLOSED.messageId,
  })
  const newestPage = render({
    text: "résolu",
    days: [{ date: CLOSED.date, entries: [CLOSED] }],
    before: "1568100000000000009",
  })

  expect(html).toContain(
    'href="/bot-log?text=r%C3%A9solu&amp;before=1568100000000000001"'
  )
  expect(html).not.toContain("Revenir aux plus récents")
  expect(newestPage).toContain('href="/bot-log?text=r%C3%A9solu"')
  expect(textOf(newestPage)).toContain("Revenir aux plus récents")
  expect(textOf(html)).toContain("Jusqu’au 3 nov. 2026")
})
