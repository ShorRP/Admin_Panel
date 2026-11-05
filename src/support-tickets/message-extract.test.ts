import type { APIEmbed, APIUser } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { messageExtract } from "./message-extract"

const MEMBER: APIUser = {
  id: "1400000000000000001",
  username: "lyra_gates",
  discriminator: "0",
  avatar: null,
  global_name: null,
}

const BOT: APIUser = { ...MEMBER, id: "1400000000000000009", bot: true }

const NAMES = {
  users: new Map([["1400000000000000001", "Lyra"]]),
  roles: new Map([["1300000000000000001", "Support"]]),
  channels: new Map([["1500000000000000001", "général"]]),
}

function extractOf(
  content: string,
  {
    author = MEMBER,
    embeds = [],
  }: { author?: APIUser; embeds?: APIEmbed[] } = {}
) {
  return messageExtract({ content, author, embeds }, NAMES)
}

test("a message's text is its content, its lines and its runs of spaces gathered into single spaces", () => {
  expect(extractOf("  Bonjour,\n\n  mon launcher   plante\t!  ")).toBe(
    "Bonjour, mon launcher plante !"
  )
})

test("a mention is written as the name the panel knows for it, with a word standing in for one it does not", () => {
  expect(
    extractOf(
      "<@1400000000000000001> et <@!1400000000000000001> voient <@1400000000000000777>"
    )
  ).toBe("@Lyra et @Lyra voient @membre")
  expect(extractOf("<@&1300000000000000001> et <@&1300000000000000777>")).toBe(
    "@Support et @rôle"
  )
  expect(extractOf("<#1500000000000000001> et <#1500000000000000777>")).toBe(
    "#général et #salon"
  )
})

test("a custom emoji is written as its name between colons, and @everyone and @here stay as typed", () => {
  expect(
    extractOf("<:pouce:1600000000000000001> <a:danse:1600000000000000002>")
  ).toBe(":pouce: :danse:")
  expect(extractOf("@everyone et @here")).toBe("@everyone et @here")
})

test("a text of 160 characters stays whole, and a longer one is cut so that it holds 160 characters, its ellipsis the last", () => {
  expect(extractOf("a".repeat(160))).toBe("a".repeat(160))
  expect(extractOf("a".repeat(161))).toBe(`${"a".repeat(159)}…`)
  expect(Array.from(extractOf("a".repeat(500)))).toHaveLength(160)
})

test("the cut counts characters, not UTF-16 units, so that an emoji is never split", () => {
  expect(extractOf("🔧".repeat(161))).toBe(`${"🔧".repeat(159)}…`)
})

test("the description of the embeds of a bot's message follows its content, where the embeds of a member's message are left out", () => {
  const embeds = [{ description: "Bienvenue <@1400000000000000001>" }, {}]

  expect(extractOf("<@1400000000000000001>", { author: BOT, embeds })).toBe(
    "@Lyra Bienvenue @Lyra"
  )
  expect(extractOf("Salut", { embeds })).toBe("Salut")
  expect(extractOf("", { embeds })).toBe("")
})

test("a message with no text gives an empty extract", () => {
  expect(extractOf("")).toBe("")
  expect(extractOf(" \n ", { author: BOT, embeds: [{ title: "Titre" }] })).toBe(
    ""
  )
})
