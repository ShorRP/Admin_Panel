import { expect, test } from "vitest"

import examples from "./bot-log-examples.json"
import { botLogChannel, botLogEmbed, botLogMessage } from "./bot-log-message"

test("an embed is the shared example, as Discord returns it", () => {
  expect(botLogEmbed("tickets-ticket-opened")).toEqual(
    examples["tickets-ticket-opened"]
  )
})

test("the IDs of an example are replaced in one pass, in every field", () => {
  const embed = botLogEmbed("tickets-ticket-closed", {
    ids: {
      "1400000000000000001": "1400000000000000002",
      "1400000000000000002": "1400000000000000001",
    },
  })

  expect(embed.fields?.map(({ value }) => value)).toEqual([
    "🔧 Problème technique",
    "<@1400000000000000002> (`1400000000000000002`)",
    "<#1400000000000000020> (`1400000000000000020`)",
    "<@1400000000000000001> (`1400000000000000001`)",
    "Problème résolu",
  ])
})

test("a field's value, the title and the timestamp can be changed", () => {
  const embed = botLogEmbed("tickets-ticket-closed", {
    fields: { Motif: "Doublon" },
    title: "Tickets · Autre",
    timestamp: "2026-11-07T10:00:00+00:00",
  })

  expect(embed).toMatchObject({
    title: "Tickets · Autre",
    timestamp: "2026-11-07T10:00:00+00:00",
  })
  expect(embed.fields?.at(-1)).toEqual({
    name: "Motif",
    value: "Doublon",
    inline: true,
  })
})

test("a message carries one embed, and an author only when one is named, so that the fake gives the application", () => {
  expect(
    botLogMessage({ example: "rules-membre-role-given", channelId: "1" })
  ).toEqual({
    channelId: "1",
    embeds: [botLogEmbed("rules-membre-role-given")],
  })
  expect(
    botLogMessage({
      example: "rules-membre-role-given",
      channelId: "1",
      authorId: "2",
    })
  ).toMatchObject({ authorId: "2" })
})

test("the channel is « 🔧・log-admin », viewed by the roles it is given", () => {
  expect(
    botLogChannel({ id: "1550837163464327289", viewerRoleIds: ["5"] })
  ).toMatchObject({
    id: "1550837163464327289",
    name: "🔧・log-admin",
    permission_overwrites: [{ id: "5", type: 0 }],
  })
})
