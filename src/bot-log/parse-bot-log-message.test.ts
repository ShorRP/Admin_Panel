import { expect, test } from "vitest"

import type { ChannelMessage } from "@/discord/discord-api"
import examples from "./bot-log-examples.json"
import { BOT_LOG_FAMILIES, BOT_LOG_FAMILY_KEYS } from "./bot-log-families"
import { botLogEmbed, type BotLogExampleName } from "./bot-log-message"
import { parseBotLogMessage } from "./parse-bot-log-message"

const MESSAGE_ID = "1568500000000000000"

const CHANNEL_ID = "1568022878765719651"

function messageWith(
  embeds: ChannelMessage["embeds"],
  content = ""
): ChannelMessage {
  return {
    id: MESSAGE_ID,
    channel_id: CHANNEL_ID,
    content,
    author: {
      id: "1200000000000000000",
      username: "Shor",
      discriminator: "0",
      avatar: null,
      global_name: null,
    },
    embeds,
  }
}

function parse(name: BotLogExampleName) {
  return parseBotLogMessage(messageWith([botLogEmbed(name)]))
}

test("an example of the Règlement family is an event of that family, its action the rest of the title", () => {
  expect(parse("rules-membre-role-given")).toMatchObject({
    kind: "event",
    family: "rules",
    action: "Rôle Membre donné",
    messageId: MESSAGE_ID,
    channelId: CHANNEL_ID,
  })
})

test.each([
  ["voice-channels-channel-created", "voice-channels"],
  ["voice-channels-focus-mode-on", "voice-channels"],
  ["tickets-ticket-opened", "tickets"],
  ["tickets-ticket-closed", "tickets"],
] as const)("the example %s is an event of the family %s", (name, family) => {
  expect(parse(name)).toMatchObject({ kind: "event", family })
})

test("the time of a line is its embed's timestamp, as ADR 0009 sets it", () => {
  const entry = parse("rules-membre-role-given")

  expect(entry.date).toEqual(new Date("2026-11-06T09:30:00+00:00"))
  expect(entry.date).not.toEqual(new Date("2026-11-07T05:39:01.320Z"))
})

test("a line with no timestamp, or one that is no date, falls back to the date of its message", () => {
  const withNone = parseBotLogMessage(
    messageWith([{ title: "Tickets · Ticket ouvert" }])
  )
  const withInvalid = parseBotLogMessage(
    messageWith([{ title: "Tickets · Ticket ouvert", timestamp: "hier" }])
  )
  const raw = parseBotLogMessage(
    messageWith([
      { title: "Serveur redémarré", timestamp: "2026-11-06T10:00:00Z" },
    ])
  )

  expect(withNone.date).toEqual(new Date("2026-11-07T05:39:01.320Z"))
  expect(withInvalid.date).toEqual(new Date("2026-11-07T05:39:01.320Z"))
  expect(raw.date).toEqual(new Date("2026-11-06T10:00:00Z"))
})

test("every field is kept, in order, with its name, its value split into text and mentions", () => {
  const entry = parse("tickets-ticket-closed")

  expect(entry.kind === "event" && entry.fields).toEqual([
    {
      name: "Type de demande",
      parts: [{ kind: "text", text: "🔧 Problème technique" }],
    },
    {
      name: "Ouvert par",
      parts: [{ kind: "account", id: "1400000000000000001", name: null }],
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
  ])
})

test("a role mention is a role, and the ID beside a mention is not shown twice", () => {
  const entry = parse("rules-membre-role-given")

  expect(
    entry.kind === "event" && entry.fields.map(({ parts }) => parts)
  ).toEqual([
    [{ kind: "account", id: "1400000000000000001", name: null }],
    [{ kind: "role", id: "1400000000000000010", name: null }],
    [{ kind: "text", text: "Réaction ✅" }],
  ])
})

test("a mention of the other form, <@!id>, is an account too, and text around mentions is kept", () => {
  const entry = parseBotLogMessage(
    messageWith([
      {
        title: "Vocaux · Membre expulsé",
        fields: [
          {
            name: "Membre expulsé",
            value: "avant <@!1400000000000000002> après <#1400000000000000020>",
          },
        ],
      },
    ])
  )

  expect(entry.kind === "event" && entry.fields[0]?.parts).toEqual([
    { kind: "text", text: "avant " },
    { kind: "account", id: "1400000000000000002", name: null },
    { kind: "text", text: " après " },
    { kind: "channel", id: "1400000000000000020", name: null },
  ])
})

test("every shared example is a row of the table of ADR 0009, and every row has an example", () => {
  const titles = Object.values(examples).map(({ title }) => title)
  const rows = BOT_LOG_FAMILY_KEYS.flatMap((key) =>
    BOT_LOG_FAMILIES[key].actions.map(
      (action) => `${BOT_LOG_FAMILIES[key].label} · ${action}`
    )
  )

  expect(titles.toSorted()).toEqual(rows.toSorted())
})

test.each([
  ["a known family with an action no row describes", "Tickets · Autre chose"],
  ["a family with no row yet", "Serveurs de jeu · Serveur redémarré"],
])(
  "%s is a raw line, as ADR 0009 says of a message that no row describes",
  (_name, title) => {
    const entry = parseBotLogMessage(
      messageWith([{ title, fields: [{ name: "Durée", value: "12 s" }] }])
    )

    expect(entry).toMatchObject({ kind: "raw", title })
  }
)

test("the description and the author of an embed, which the format has none of, are kept as extra text", () => {
  const entry = parseBotLogMessage(
    messageWith([
      {
        title: "Tickets · Ticket ouvert",
        description: "Texte en plus",
        author: { name: "Quelqu’un" },
      },
    ])
  )

  expect(entry.kind === "event" && entry.extra).toEqual([
    { name: null, value: "Quelqu’un" },
    { name: null, value: "Texte en plus" },
  ])
})

test.each([
  [
    "a title with no family of the Bot log",
    [{ title: "Inconnue · Action" }],
    "",
  ],
  ["a title with no separator", [{ title: "Serveur redémarré" }], ""],
  ["an embed with no title", [{ description: "Texte" }], ""],
  [
    "two embeds",
    [{ title: "Tickets · Ticket ouvert" }, { title: "Tickets · Ticket fermé" }],
    "",
  ],
  [
    "some content beside the embed",
    [{ title: "Tickets · Ticket ouvert" }],
    "Salut",
  ],
  ["no embed", [], "Texte seul"],
] as const)(
  "%s is a raw line, which shows what it holds",
  (_name, embeds, content) => {
    const entry = parseBotLogMessage(messageWith([...embeds], content))

    expect(entry.kind).toBe("raw")
  }
)

test("a raw line keeps its title and each text that Discord shows", () => {
  const entry = parseBotLogMessage(
    messageWith([
      {
        title: "Serveur redémarré",
        description: "Redémarrage planifié",
        fields: [{ name: "Durée", value: "12 s" }],
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "raw",
    title: "Serveur redémarré",
    fields: [
      { name: null, value: "Redémarrage planifié" },
      { name: "Durée", value: "12 s" },
    ],
  })
})
