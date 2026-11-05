import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { OpenSupportTickets } from "./open-support-tickets"
import type {
  OpenSupportTicket,
  OpenSupportTickets as OpenSupportTicketsRead,
} from "./read-open-support-tickets"

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

const LYRA = { id: "1400000000000000003", name: "Lyra" }

const BRYNJA = { id: "1400000000000000002", name: "Brynja la Rousse" }

const ALDIS = { id: "1400000000000000001", name: "aldis" }

const BOT = { id: "1400000000000000009", name: "Shor - Bot" }

const ANSWERED: OpenSupportTicket = {
  channelId: "1500000000000000001",
  url: "https://discord.com/channels/1100000000000000000/1500000000000000001",
  requestKind: "🔧 Problème technique",
  opener: LYRA,
  openedAt: new Date("2026-11-02T10:00:00Z"),
  lastActivityAt: new Date("2026-11-04T08:15:30Z"),
  messageCount: 4,
  moreMessages: false,
  repliers: [BRYNJA, ALDIS],
  lastMessage: {
    author: LYRA,
    byBot: false,
    text: "Oui, ça plante toujours",
  },
}

const WAITING: OpenSupportTicket = {
  channelId: "1500000000000000002",
  url: "https://discord.com/channels/1100000000000000000/1500000000000000002",
  requestKind: "🚨 Signaler un joueur",
  opener: { id: "1400000000000000004", name: "corvus" },
  openedAt: new Date("2026-11-03T14:32:10Z"),
  lastActivityAt: new Date("2026-11-03T14:32:10Z"),
  messageCount: 100,
  moreMessages: true,
  repliers: [],
  lastMessage: { author: BOT, byBot: true, text: "@corvus Bienvenue" },
}

function render(read: OpenSupportTicketsRead, opensModeration = false) {
  return renderToStaticMarkup(
    <OpenSupportTickets read={read} opensModeration={opensModeration} />
  )
}

function readOf(...tickets: OpenSupportTicket[]): OpenSupportTicketsRead {
  return { kind: "read", tickets }
}

test("the tickets category not being configured is said, with no list", () => {
  const html = render({ kind: "unconfigured" })

  expect(text(html)).toBe(
    "La catégorie des tickets n’est pas configurée pour ce serveur Discord."
  )
  expect(html).not.toContain("<ul")
})

test("no ticket in progress is said in one sentence, with no list", () => {
  const html = render(readOf())

  expect(text(html)).toBe("Aucun ticket n’est en cours.")
  expect(html).not.toContain("<ul")
})

test("a ticket shows its request kind, its messages, who opened it and when, its last activity, the staff who answered, its last message with its author and a link to its channel", () => {
  const html = render(readOf(ANSWERED))

  expect(items(html)).toEqual([
    "🔧 Problème technique4 messagesOuvert parLyra2 nov. 2026, 11:00Dernière activité4 nov. 2026, 09:15Réponses du staffBrynja la RoussealdisDernier messageLyraOui, ça plante toujoursOuvrir dans Discord",
  ])
  expect(linksOf(html)).toEqual([
    [
      "https://discord.com/channels/1100000000000000000/1500000000000000001",
      "Ouvrir dans Discord",
    ],
  ])
})

test("a ticket with 100 messages or more says 100+, and one with a single message says message in the singular", () => {
  const html = render(
    readOf(WAITING, { ...ANSWERED, messageCount: 1, moreMessages: false })
  )

  expect(items(html)[0]).toMatch(/^🚨 Signaler un joueur100\+ messagesOuvert/)
  expect(items(html)[1]).toMatch(/^🔧 Problème technique1 messageOuvert/)
})

test("a ticket no staff member answered says so, and one nobody wrote in says that too", () => {
  const html = render(
    readOf(WAITING, {
      ...WAITING,
      channelId: "1500000000000000003",
      messageCount: 0,
      moreMessages: false,
      lastMessage: null,
    })
  )

  const [waiting, empty] = items(html)
  expect(waiting).toContain(
    "Réponses du staffAucune réponse du staff pour l’instant."
  )
  expect(waiting).toContain("Dernier messageShor - Bot@corvus Bienvenue")
  expect(empty).toContain("Dernier messageAucun message pour l’instant.")
})

test("a last message with no text says so", () => {
  const html = render(
    readOf({
      ...ANSWERED,
      lastMessage: { author: LYRA, byBot: false, text: "" },
    })
  )

  expect(text(html)).toContain("Dernier messageLyraMessage sans texte")
})

test("the number of tickets in progress heads the list, in the singular for one", () => {
  expect(text(render(readOf(ANSWERED)))).toMatch(/^1 ticket/)
  expect(text(render(readOf(ANSWERED, WAITING)))).toMatch(/^2 tickets/)
})

test("a staff member who does not moderate reads the opener, the staff who answered and the last author as text, and one who moderates follows each to their record, but a bot's message", () => {
  const withoutLinks = linksOf(render(readOf(ANSWERED, WAITING), false))
  const withLinks = linksOf(render(readOf(ANSWERED, WAITING), true))

  expect(withoutLinks.map(([, label]) => label)).toEqual([
    "Ouvrir dans Discord",
    "Ouvrir dans Discord",
  ])
  expect(withLinks).toEqual([
    ["/records/1400000000000000003", "Lyra"],
    ["/records/1400000000000000002", "Brynja la Rousse"],
    ["/records/1400000000000000001", "aldis"],
    ["/records/1400000000000000003", "Lyra"],
    [ANSWERED.url, "Ouvrir dans Discord"],
    ["/records/1400000000000000004", "corvus"],
    [WAITING.url, "Ouvrir dans Discord"],
  ])
})

test("the link to the channel opens Discord in a new tab, with no referrer or opener", () => {
  const html = render(readOf(ANSWERED))

  expect(html).toMatch(
    /<a[^>]*href="https:\/\/discord\.com\/channels[^"]*"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/
  )
})

test("dates are Paris time, in a time element that holds the full moment", () => {
  const html = render(readOf(ANSWERED))

  expect(html).toContain('<time dateTime="2026-11-02T10:00:00.000Z">')
  expect(html).toContain('<time dateTime="2026-11-04T08:15:30.000Z">')
})
