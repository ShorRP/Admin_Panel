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

test("a line in the script's format gives its character from the field's name, its game account and its target from the field's two lines, and leaves nothing raw", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Administration · administration:heal",
        fields: [
          {
            name: "Merida",
            value: "compte 2094594320\nCible : 4278190515",
          },
          { name: "Lieu", value: "3c:Skyrim.esm · -82079, 4766, -4803" },
        ],
        footer: { text: "Shor · 189b92f6" },
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "event",
    category: "Administration",
    action: "administration:heal",
    character: "Merida",
    gameAccount: "2094594320",
    target: "4278190515",
    reason: null,
    place: "3c:Skyrim.esm · -82079, 4766, -4803",
    eventId: "189b92f6",
    extra: [],
  })
})

test("a line in the script's format without a target gives its character and its game account, and no target", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Personnages · déconnexion",
        fields: [
          { name: "Merida", value: "compte 2094594320" },
          { name: "Lieu", value: "3c:Skyrim.esm · -83126, 6397, -4418" },
        ],
        footer: { text: "Shor · e7f5107a" },
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "event",
    category: "Personnages",
    action: "déconnexion",
    character: "Merida",
    gameAccount: "2094594320",
    target: null,
    place: "3c:Skyrim.esm · -83126, 6397, -4418",
    eventId: "e7f5107a",
    extra: [],
  })
})

test.each([
  ["administration:workshop:create", "administration:workshop:create"],
  ["administration:heal", "administration:heal"],
  ["déconnexion", "déconnexion"],
])("the action %s is kept whole", (action, expected) => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: `Administration · ${action}`,
        fields: [{ name: "Merida", value: "compte 2094594320" }],
      },
    ])
  )

  expect(entry).toMatchObject({ kind: "event", action: expected })
})

test("a line of the character's field that the parser does not know stays raw, beside the target it reads", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Administration · administration:heal",
        fields: [
          {
            name: "Merida",
            value: "compte 2094594320\nCible : 4278190515\nNote libre",
          },
        ],
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "event",
    character: "Merida",
    gameAccount: "2094594320",
    target: "4278190515",
    extra: [{ name: null, value: "Note libre" }],
  })
})

test("a field named after a label that holds the game account is the character's, and not a label", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Personnages · déconnexion",
        fields: [{ name: "Lieu", value: "compte 2094594320" }],
      },
    ])
  )

  expect(entry).toMatchObject({
    kind: "event",
    character: "Lieu",
    gameAccount: "2094594320",
    place: null,
    extra: [],
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

test("a line wholly in format leaves nothing over", () => {
  expect(parseGameLogMessage(messageOf([gameLogEmbed()]))).toMatchObject({
    kind: "event",
    extra: [],
  })
})

test("what a line in format holds beyond what the parser reads shows raw with the event, in the order Discord shows it, so that no text is lost", () => {
  const entry = parseGameLogMessage(
    messageOf(
      [
        {
          title: "Administration · administration:heal",
          author: { name: "Serveur de jeu" },
          description:
            "Merida · compte 2094594320\nUne remarque libre\nExtra: zzz",
          fields: [
            { name: "Cible", value: "4278190080" },
            { name: "Extra", value: "yyy" },
            { name: "Cible", value: "9999" },
          ],
          footer: { text: "Pied libre" },
        },
        { title: "Autre embed", description: "Son texte" },
      ],
      "Le contenu du message"
    )
  )

  expect(entry).toMatchObject({
    kind: "event",
    character: "Merida",
    gameAccount: "2094594320",
    target: "4278190080",
    eventId: null,
    extra: [
      { name: null, value: "Le contenu du message" },
      { name: null, value: "Serveur de jeu" },
      { name: null, value: "Une remarque libre" },
      { name: null, value: "Extra: zzz" },
      { name: "Extra", value: "yyy" },
      { name: "Cible", value: "9999" },
      { name: null, value: "Pied libre" },
      { name: null, value: "Autre embed" },
      { name: null, value: "Son texte" },
    ],
  })
})

test("a line out of format keeps the author's name and the text of the other embeds among its raw fields", () => {
  const entry = parseGameLogMessage(
    messageOf([
      {
        title: "Serveur redémarré",
        author: { name: "Serveur de jeu" },
        fields: [{ name: "Durée", value: "12 s" }],
      },
      { title: "Second", fields: [{ name: "Raison", value: "Mise à jour" }] },
    ])
  )

  expect(entry).toMatchObject({
    kind: "raw",
    title: "Serveur redémarré",
    fields: [
      { name: null, value: "Serveur de jeu" },
      { name: "Durée", value: "12 s" },
      { name: null, value: "Second" },
      { name: "Raison", value: "Mise à jour" },
    ],
  })
})
