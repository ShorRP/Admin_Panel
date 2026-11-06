import { expect, test } from "vitest"

import type { MessageSearchQuery } from "@/discord/discord-api"
import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { MAX_SEARCHES } from "@/discord/message-search-limits"
import { botLogMessage, type BotLogExampleName } from "./bot-log-message"
import { readBotLog, type BotLogPage } from "./read-bot-log"

const CHANNEL_ID = "1568022878765719651"

const OTHER_CHANNEL_ID = "1568022814483685377"

const TICKET_CHANNEL_ID = "1400000000000000020"

const ROLE_ID = "1400000000000000010"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const LYRA = { id: "1400000000000000003", username: "lyra_gates" }

const SKY_ID = "1400000000000000009"

const CONFIG = { channelId: CHANNEL_ID }

class SpiedDiscord extends FakeDiscord {
  readonly searches: MessageSearchQuery[] = []

  override searchMessages(query: MessageSearchQuery) {
    this.searches.push(query)
    return super.searchMessages(query)
  }
}

function discordWith(messages: FakeChannelMessage[]) {
  return new SpiedDiscord({
    roles: [{ id: ROLE_ID, name: "Membre" }],
    members: [
      { user: ALDIS, nick: "Aldis le Brave" },
      { user: BRYNJA },
      { user: LYRA },
    ],
    channels: [
      CHANNEL_ID,
      OTHER_CHANNEL_ID,
      { id: TICKET_CHANNEL_ID, name: "🎫・ticket-0042" },
    ],
    channelMessages: messages,
  })
}

async function read(
  discord: FakeDiscord,
  searchParams: Parameters<typeof readBotLog>[3] = {}
) {
  return await readBotLog(
    discord,
    CONFIG,
    {
      roles: (await discord.getGuild()).roles,
      channels: await discord.listChannels(),
    },
    searchParams
  )
}

function line(
  example: BotLogExampleName,
  sentAt: string,
  extra: Partial<Parameters<typeof botLogMessage>[0]> = {}
) {
  return botLogMessage({
    example,
    channelId: CHANNEL_ID,
    sentAt: new Date(sentAt),
    ...extra,
  })
}

function titlesOf({ days }: BotLogPage) {
  return days.flatMap(({ entries }) =>
    entries.map((entry) =>
      entry.kind === "event"
        ? `${entry.family}:${entry.action}`
        : `raw:${entry.title}`
    )
  )
}

function secondAt(index: number) {
  return new Date(Date.UTC(2026, 10, 1, 8, 0, index)).toISOString()
}

test("the Bot log is the application's messages in its channel, newest first, grouped by day of Paris", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-02T22:30:00Z"),
    line("tickets-ticket-opened", "2026-11-02T23:30:00Z"),
    line("voice-channels-channel-created", "2026-11-03T08:00:00Z"),
  ])

  const page = await read(discord)

  expect(page.days.map(({ date }) => date.toISOString())).toEqual([
    "2026-11-03T08:00:00.000Z",
    "2026-11-02T22:30:00.000Z",
  ])
  expect(page.days.map(({ entries }) => entries.length)).toEqual([2, 1])
  expect(titlesOf(page)).toEqual([
    "voice-channels:Vocal créé",
    "tickets:Ticket ouvert",
    "rules:Rôle Membre donné",
  ])
})

test("a message of another author, Sky's, is left out, though its embed is the Bot's to the letter", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z", { authorId: SKY_ID }),
  ])

  expect(titlesOf(await read(discord))).toEqual(["rules:Rôle Membre donné"])
})

test("a message of another author is left out even when Discord's search lets it through", async () => {
  class SloppySearch extends FakeDiscord {
    override searchMessages(query: MessageSearchQuery) {
      const withoutAuthor = { ...query }
      delete withoutAuthor.author_id
      return super.searchMessages(withoutAuthor)
    }
  }
  const discord = new SloppySearch({
    channels: [CHANNEL_ID],
    channelMessages: [
      line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
      line("tickets-ticket-opened", "2026-11-03T09:00:00Z", {
        authorId: SKY_ID,
      }),
    ],
  })

  expect(titlesOf(await read(discord))).toEqual(["rules:Rôle Membre donné"])
})

test("the application's messages in another channel are left out", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z", {
      channelId: OTHER_CHANNEL_ID,
    }),
  ])

  expect(titlesOf(await read(discord))).toEqual(["rules:Rôle Membre donné"])
})

test("the author asked of Discord is the application, whose ID the panel reads", async () => {
  const discord = discordWith([])

  await read(discord)

  expect(discord.searches).toEqual([
    expect.objectContaining({
      channel_id: [CHANNEL_ID],
      author_id: [discord.applicationUser.id],
      sort_order: "desc",
      limit: 25,
      offset: 0,
    }),
  ])
})

test("a line is the time of its message, its family and action, and its fields in order, the mentions shown with the names Discord gives", async () => {
  const discord = discordWith([
    line("tickets-ticket-closed", "2026-11-03T08:00:00Z"),
  ])

  const [entry] = (await read(discord)).days.flatMap(({ entries }) => entries)

  expect(entry).toMatchObject({
    kind: "event",
    family: "tickets",
    action: "Ticket fermé",
    date: new Date("2026-11-03T08:00:00Z"),
  })
  expect(entry?.kind === "event" && entry.fields).toEqual([
    {
      name: "Type de demande",
      parts: [{ kind: "text", text: "🔧 Problème technique" }],
    },
    {
      name: "Ouvert par",
      parts: [{ kind: "account", id: ALDIS.id, name: "Aldis le Brave" }],
    },
    {
      name: "Salon",
      parts: [
        { kind: "channel", id: TICKET_CHANNEL_ID, name: "🎫・ticket-0042" },
      ],
    },
    {
      name: "Fermé par",
      parts: [{ kind: "account", id: BRYNJA.id, name: "brynja" }],
    },
    { name: "Motif", parts: [{ kind: "text", text: "Problème résolu" }] },
  ])
})

test("a role shows with its name, and a mention that names nobody the panel can find keeps its ID", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z", {
      ids: { "1400000000000000001": "1400000000000000077" },
    }),
  ])

  const [entry] = (await read(discord)).days.flatMap(({ entries }) => entries)

  expect(entry?.kind === "event" && entry.fields.slice(0, 2)).toEqual([
    {
      name: "Membre",
      parts: [{ kind: "account", id: "1400000000000000077", name: null }],
    },
    {
      name: "Rôle",
      parts: [{ kind: "role", id: ROLE_ID, name: "Membre" }],
    },
  ])
})

test("a channel the staff member does not view shows no name", async () => {
  const discord = discordWith([
    line("voice-channels-channel-deleted", "2026-11-03T08:00:00Z"),
  ])

  const page = await readBotLog(
    discord,
    CONFIG,
    { roles: [], channels: [] },
    {}
  )
  const [entry] = page.days.flatMap(({ entries }) => entries)

  expect(entry?.kind === "event" && entry.fields[1]).toEqual({
    name: "Salon",
    parts: [{ kind: "channel", id: TICKET_CHANNEL_ID, name: null }],
  })
})

test("a message that follows no row is read raw beside the others, without failing the page", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
    {
      channelId: CHANNEL_ID,
      sentAt: new Date("2026-11-03T09:00:00Z"),
      embeds: [{ title: "Serveur redémarré", description: "Planifié" }],
    },
    {
      channelId: CHANNEL_ID,
      sentAt: new Date("2026-11-03T10:00:00Z"),
      embeds: [{ title: "Inconnue · Quelque chose" }],
    },
    {
      channelId: CHANNEL_ID,
      sentAt: new Date("2026-11-03T11:00:00Z"),
      content: "Texte seul",
    },
  ])

  expect(titlesOf(await read(discord))).toEqual([
    "raw:Texte seul",
    "raw:Inconnue · Quelque chose",
    "raw:Serveur redémarré",
    "rules:Rôle Membre donné",
  ])
})

test("an action that no row of the format describes is read raw, whatever its family", async () => {
  const discord = discordWith([
    line("tickets-ticket-opened", "2026-11-03T08:00:00Z", {
      title: "Tickets · Autre chose",
    }),
  ])

  expect(titlesOf(await read(discord))).toEqual(["raw:Tickets · Autre chose"])
  expect(titlesOf(await read(discord, { family: "tickets" }))).toEqual([])
})

test("a line is dated and grouped by its embed's timestamp, the period and the cursor going by message IDs", async () => {
  const discord = discordWith([
    line("tickets-ticket-opened", "2026-11-03T23:00:02Z", {
      timestamp: "2026-11-03T22:59:58Z",
    }),
  ])

  const page = await read(discord)
  const afterMidnight = await read(discord, { from: "2026-11-04" })
  const beforeMidnight = await read(discord, { to: "2026-11-03" })

  expect(page.days.map(({ date }) => date.toISOString())).toEqual([
    "2026-11-03T22:59:58.000Z",
  ])
  expect(afterMidnight.days).toHaveLength(1)
  expect(beforeMidnight.days).toHaveLength(0)
})

test("a family filter keeps the lines of that family", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z"),
    line("tickets-ticket-closed", "2026-11-03T10:00:00Z"),
    line("voice-channels-channel-created", "2026-11-03T11:00:00Z"),
  ])

  const page = await read(discord, { family: "tickets" })

  expect(titlesOf(page)).toEqual([
    "tickets:Ticket fermé",
    "tickets:Ticket ouvert",
  ])
  expect(page.family).toBe("tickets")
})

test("a family that Discord's search finds by its name is asked of Discord, one search for the page", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z"),
  ])

  await read(discord, { family: "tickets" })

  expect(discord.searches.map(({ content }) => content)).toEqual(["Tickets"])
})

test("a family filter drops the raw lines, which belong to none", async () => {
  const discord = discordWith([
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z"),
    {
      channelId: CHANNEL_ID,
      sentAt: new Date("2026-11-03T10:00:00Z"),
      embeds: [{ title: "Tickets, nouvelle", description: "Planifié" }],
    },
  ])

  expect(titlesOf(await read(discord, { family: "tickets" }))).toEqual([
    "tickets:Ticket ouvert",
  ])
})

test("an action filter keeps the lines whose action holds every word typed, whole, whatever the case", async () => {
  const discord = discordWith([
    line("voice-channels-focus-mode-on", "2026-11-03T08:00:00Z"),
    line("voice-channels-focus-mode-off", "2026-11-03T09:00:00Z"),
    line("tickets-ticket-closed", "2026-11-03T10:00:00Z"),
  ])

  expect(titlesOf(await read(discord, { action: "FOCUS mode" }))).toEqual([
    "voice-channels:Focus Mode désactivé",
    "voice-channels:Focus Mode activé",
  ])
  expect(titlesOf(await read(discord, { action: "activé" }))).toEqual([
    "voice-channels:Focus Mode activé",
  ])
  expect(titlesOf(await read(discord, { action: "fermé" }))).toEqual([
    "tickets:Ticket fermé",
  ])
})

test("an action filter and a family filter combine", async () => {
  const discord = discordWith([
    line("tickets-ticket-opened", "2026-11-03T08:00:00Z"),
    line("voice-channels-channel-created", "2026-11-03T09:00:00Z"),
  ])

  expect(
    titlesOf(
      await read(discord, { family: "voice-channels", action: "ticket" })
    )
  ).toEqual([])
  expect(
    titlesOf(await read(discord, { family: "tickets", action: "ticket" }))
  ).toEqual(["tickets:Ticket ouvert"])
})

test("an account filter by ID or by mention keeps the lines that name the account in any field", async () => {
  const discord = discordWith([
    line("tickets-ticket-closed", "2026-11-03T08:00:00Z"),
    line("rules-membre-role-given", "2026-11-03T09:00:00Z", {
      ids: { "1400000000000000001": LYRA.id },
    }),
    line("voice-channels-member-expelled", "2026-11-03T10:00:00Z", {
      ids: { "1400000000000000002": BRYNJA.id },
    }),
  ])

  const byId = await read(discord, { account: BRYNJA.id })
  const byMention = await read(discord, { account: `<@${BRYNJA.id}>` })

  expect(titlesOf(byId)).toEqual([
    "voice-channels:Membre expulsé",
    "tickets:Ticket fermé",
  ])
  expect(titlesOf(byMention)).toEqual(titlesOf(byId))
})

test("an account filter by name finds the account the same way /support-tickets does, and asks Discord for its ID", async () => {
  const discord = discordWith([
    line("tickets-ticket-closed", "2026-11-03T08:00:00Z"),
    line("rules-membre-role-given", "2026-11-03T09:00:00Z", {
      ids: { "1400000000000000001": LYRA.id },
    }),
  ])

  const page = await read(discord, { account: "lyra" })

  expect(titlesOf(page)).toEqual(["rules:Rôle Membre donné"])
  expect(discord.searches.map(({ content }) => content)).toEqual([LYRA.id])
})

test("an account that no member and no banned account is named by says so, and the page reads no message", async () => {
  const discord = discordWith([
    line("tickets-ticket-closed", "2026-11-03T08:00:00Z"),
  ])

  const page = await read(discord, { account: "zzz" })

  expect(page.notice).toEqual({ filter: "account", text: "zzz", kind: "none" })
  expect(page.days).toEqual([])
  expect(discord.searches).toEqual([])
})

test("an account name that several accounts start says so", async () => {
  const discord = new SpiedDiscord({
    members: [
      { user: { id: "1400000000000000004", username: "lyra" } },
      { user: { id: "1400000000000000005", username: "lyria" } },
    ],
    channels: [CHANNEL_ID],
  })

  const page = await readBotLog(
    discord,
    CONFIG,
    { roles: [], channels: [] },
    { account: "ly" }
  )

  expect(page.notice).toEqual({
    filter: "account",
    text: "ly",
    kind: "several",
  })
  expect(discord.searches).toEqual([])
})

test("a channel filter by ID or mention keeps the lines that name the channel, whether or not it still exists", async () => {
  const discord = discordWith([
    line("tickets-ticket-opened", "2026-11-03T08:00:00Z"),
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z", {
      ids: { "1400000000000000020": "1400000000000000099" },
    }),
  ])

  expect(titlesOf(await read(discord, { channel: TICKET_CHANNEL_ID }))).toEqual(
    ["tickets:Ticket ouvert"]
  )
  const gone = await read(discord, { channel: "<#1400000000000000099>" })
  expect(
    gone.days.flatMap(({ entries }) => entries.map(({ date }) => date))
  ).toEqual([new Date("2026-11-03T09:00:00Z")])
})

test("a channel filter by name resolves among the channels the staff member views", async () => {
  const discord = discordWith([
    line("tickets-ticket-opened", "2026-11-03T08:00:00Z"),
    line("tickets-ticket-opened", "2026-11-03T09:00:00Z", {
      ids: { "1400000000000000020": "1400000000000000099" },
    }),
  ])

  const found = await read(discord, { channel: "ticket-0042" })
  const hidden = await readBotLog(
    discord,
    CONFIG,
    { roles: [], channels: [] },
    { channel: "ticket-0042" }
  )

  expect(found.days.flatMap(({ entries }) => entries)).toHaveLength(1)
  expect(found.notice).toBeNull()
  expect(hidden.notice).toEqual({
    filter: "channel",
    text: "ticket-0042",
    kind: "none",
  })
})

test("a text keeps the lines whose words it holds in one of their texts, field values included", async () => {
  const discord = discordWith([
    line("tickets-ticket-closed", "2026-11-03T08:00:00Z", {
      fields: { Motif: "Résolu avec les ids" },
    }),
    line("tickets-ticket-closed", "2026-11-03T09:00:00Z", {
      fields: { Motif: "Doublon" },
    }),
    line("rules-membre-role-given", "2026-11-03T10:00:00Z"),
  ])

  expect(titlesOf(await read(discord, { text: "ids résolu" }))).toEqual([
    "tickets:Ticket fermé",
  ])
  expect(titlesOf(await read(discord, { text: "réaction" }))).toEqual([
    "rules:Rôle Membre donné",
  ])
})

test("a text and an account both filter, Discord being asked for the account and the text checked on the pages it gives", async () => {
  const discord = discordWith([
    line("tickets-ticket-closed", "2026-11-03T08:00:00Z", {
      fields: { Motif: "Doublon" },
    }),
    line("tickets-ticket-closed", "2026-11-03T09:00:00Z", {
      fields: { Motif: "Résolu" },
    }),
  ])

  const page = await read(discord, { account: ALDIS.id, text: "doublon" })

  expect(titlesOf(page)).toEqual(["tickets:Ticket fermé"])
  expect(
    page.days.flatMap(({ entries }) => entries.map(({ date }) => date))
  ).toEqual([new Date("2026-11-03T08:00:00Z")])
  expect(discord.searches.map(({ content }) => content)).toEqual([ALDIS.id])
})

test("a period keeps the lines of its days of Paris, both included", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-02T22:30:00Z"),
    line("rules-membre-role-given", "2026-11-02T23:30:00Z"),
    line("rules-membre-role-given", "2026-11-03T22:30:00Z"),
    line("rules-membre-role-given", "2026-11-03T23:30:00Z"),
  ])

  const page = await read(discord, { from: "2026-11-03", to: "2026-11-03" })

  expect(
    page.days.flatMap(({ entries }) =>
      entries.map(({ date }) => date.toISOString())
    )
  ).toEqual(["2026-11-03T22:30:00.000Z", "2026-11-02T23:30:00.000Z"])
})

test("a period that ends before it starts reads nothing and asks Discord nothing", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
  ])

  const page = await read(discord, { from: "2026-11-04", to: "2026-11-03" })

  expect(page.days).toEqual([])
  expect(discord.searches).toEqual([])
})

test("an invalid filter counts as absent", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
  ])

  const page = await read(discord, {
    family: "nope",
    action: "!!!",
    text: ["a", "b"],
    from: "2026-02-30",
    to: "",
    before: "abc",
  })

  expect(titlesOf(page)).toEqual(["rules:Rôle Membre donné"])
  expect(page.before).toBeNull()
})

test("a full page leads to the older lines by the ID of its last line, and the older page repeats nothing and skips nothing", async () => {
  const discord = discordWith(
    Array.from({ length: 30 }, (_, index) =>
      line("rules-membre-role-given", secondAt(index), {
        fields: { Déclencheur: `ligne ${index}` },
      })
    )
  )

  const first = await read(discord)
  const second = await read(discord, { before: first.older ?? "" })

  const times = (page: BotLogPage) =>
    page.days.flatMap(({ entries }) =>
      entries.map(({ date }) => date.toISOString())
    )
  expect(times(first)).toHaveLength(25)
  expect(first.older).toBe(
    first.days.at(-1)?.entries.at(-1)?.messageId ?? "nothing"
  )
  expect(times(second)).toHaveLength(5)
  expect(second.before).toBe(first.older)
  expect(second.older).toBeNull()
  expect([...times(first), ...times(second)]).toEqual(
    Array.from({ length: 30 }, (_, index) => secondAt(29 - index))
  )
})

test("a page short of 25 lines has no older page", async () => {
  const discord = discordWith([
    line("rules-membre-role-given", "2026-11-03T08:00:00Z"),
  ])

  expect((await read(discord)).older).toBeNull()
})

test("a filter that Discord's search cannot serve is checked on the pages read, up to four searches, and the page says it was cut", async () => {
  const noise = Array.from({ length: MAX_SEARCHES * 25 + 5 }, (_, index) =>
    line("tickets-ticket-opened", secondAt(index + 1), {
      ids: { "1400000000000000020": "1400000000000000099" },
    })
  )
  const discord = discordWith([
    line("tickets-ticket-opened", secondAt(0)),
    ...noise,
  ])

  const first = await read(discord, {
    account: ALDIS.id,
    channel: TICKET_CHANNEL_ID,
  })

  expect(discord.searches).toHaveLength(MAX_SEARCHES)
  expect(first.days).toEqual([])
  expect(first.cut).toBe(true)
  expect(first.older).not.toBeNull()

  const second = await read(discord, {
    account: ALDIS.id,
    channel: TICKET_CHANNEL_ID,
    before: first.older ?? "",
  })

  expect(second.days.flatMap(({ entries }) => entries)).toHaveLength(1)
  expect(second.cut).toBe(false)
  expect(second.older).toBeNull()
})

test("the lines that pass are kept when the search stops on a full page of them", async () => {
  const discord = discordWith(
    Array.from({ length: 40 }, (_, index) =>
      line("tickets-ticket-opened", secondAt(index))
    )
  )

  const page = await read(discord, {
    account: ALDIS.id,
    channel: TICKET_CHANNEL_ID,
  })

  expect(page.days.flatMap(({ entries }) => entries)).toHaveLength(25)
  expect(page.cut).toBe(false)
  expect(page.older).not.toBeNull()
  expect(discord.searches).toHaveLength(1)
})
