import type { APIEmbed } from "discord-api-types/v10"
import { expect, test } from "vitest"

import type { ChannelMessage } from "@/discord/discord-api"
import { gameLogEmbed } from "./game-log-message"
import { parseGameLogMessage } from "./parse-game-log-message"

const CHANNEL_ID = "1568022814483685377"

const WEBHOOK_ID = "1568023050346307647"

const MESSAGE_ID = "1568100000000000000"

function messageOf(embeds: APIEmbed[], content = ""): ChannelMessage {
  return {
    id: MESSAGE_ID,
    channel_id: CHANNEL_ID,
    content,
    author: {
      id: WEBHOOK_ID,
      username: "Shor",
      discriminator: "0",
      avatar: null,
      global_name: null,
    },
    embeds,
  }
}

test("a line in the game server's format gives its category, action, character, game account, target, place and identifier", () => {
  const entry = parseGameLogMessage(messageOf([gameLogEmbed()]))

  expect(entry).toMatchObject({
    kind: "event",
    messageId: MESSAGE_ID,
    channelId: CHANNEL_ID,
    category: "Administration",
    action: "administration:heal",
    character: "Merida",
    gameAccount: "2094594320",
    target: "4278190080",
    reason: null,
    place: "3c:Skyrim.esm · 3816, -5303, -5681",
    eventId: "189b92f6",
  })
})

test("a line takes its date from its message's ID", () => {
  const entry = parseGameLogMessage(messageOf([gameLogEmbed()]))

  expect(entry.date).toEqual(new Date("2026-11-06T03:09:33.889Z"))
})

test("a reason, when the line carries one, is its own", () => {
  const entry = parseGameLogMessage(
    messageOf([gameLogEmbed({ reason: "Test de la commande" })])
  )

  expect(entry).toMatchObject({ kind: "event", reason: "Test de la commande" })
})

test("the target, the reason and the place are found in the description as well as in the fields, whatever the markdown around their labels", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Personnages · character:disconnect",
        description:
          "**Merida** · compte 2094594320\n**Cible** : 4278190080\nMotif: Déconnexion\nLieu : `3c:Skyrim.esm · 1, 2, 3`",
        footer: { text: "Shor · 0a1b2c3d" },
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "event",
    category: "Personnages",
    action: "character:disconnect",
    character: "Merida",
    gameAccount: "2094594320",
    target: "4278190080",
    reason: "Déconnexion",
    place: "3c:Skyrim.esm · 1, 2, 3",
    eventId: "0a1b2c3d",
  })
})

test("the character and the game account are found in the author's name as well", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Personnages · character:login",
        author: { name: "Merida · compte 2094594320" },
        footer: { text: "Shor · 0a1b2c3d" },
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "event",
    character: "Merida",
    gameAccount: "2094594320",
  })
})

test("a title with a separator is a line in format even when everything else is missing", () => {
  const entry = parseGameLogMessage(
    messageOf([{ title: "Administration · administration:heal" }])
  )

  expect(entry).toMatchObject({
    kind: "event",
    category: "Administration",
    action: "administration:heal",
    character: null,
    gameAccount: null,
    target: null,
    reason: null,
    place: null,
    eventId: null,
  })
})

test("an action that holds the separator keeps it whole", () => {
  const entry = parseGameLogMessage(
    messageOf([{ title: "Administration · give · item" }])
  )

  expect(entry).toMatchObject({
    kind: "event",
    category: "Administration",
    action: "give · item",
  })
})

test("a line whose title has no category and action is shown raw, with its title and every field as written", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Serveur redémarré",
        description: "Redémarrage planifié",
        fields: [{ name: "Durée", value: "12 s" }],
        footer: { text: "Shor · 0a1b2c3d" },
      },
    ])
  )

  expect(entry).toEqual({
    kind: "raw",
    messageId: MESSAGE_ID,
    channelId: CHANNEL_ID,
    date: expect.any(Date),
    title: "Serveur redémarré",
    fields: [
      { name: null, value: "Redémarrage planifié" },
      { name: "Durée", value: "12 s" },
      { name: null, value: "Shor · 0a1b2c3d" },
    ],
  })
})

test("a message with no embed is shown raw, its content as its title", () => {
  const entry = parseGameLogMessage(messageOf([], "Le serveur a démarré"))

  expect(entry).toMatchObject({
    kind: "raw",
    title: "Le serveur a démarré",
    fields: [],
  })
})

test("a message with neither embed nor content is shown raw with no title", () => {
  const entry = parseGameLogMessage(messageOf([]))

  expect(entry).toMatchObject({ kind: "raw", title: null, fields: [] })
})

test("a content that comes beside an embed is kept among the raw fields", () => {
  const entry = parseGameLogMessage(
    messageOf([{ title: "Panne" }], "@here regardez")
  )

  expect(entry).toMatchObject({
    kind: "raw",
    title: "Panne",
    fields: [{ name: null, value: "@here regardez" }],
  })
})
