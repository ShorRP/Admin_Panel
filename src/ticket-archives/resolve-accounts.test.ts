import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { resolveAccounts } from "./resolve-accounts"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = {
  id: "1400000000000000002",
  username: "brynja_red",
  global_name: "Brynja",
}

const LYRA = { id: "1400000000000000004", username: "lyra_gates" }

const LYRIA = { id: "1400000000000000005", username: "lyria" }

const BANNED = { id: "1400000000000000006", username: "korvald" }

const LEFT = { id: "1400000000000000007", username: "ingrid" }

function server() {
  return new FakeDiscord({
    members: [
      { user: ALDIS },
      { user: BRYNJA, nick: "Brynja la Rousse" },
      { user: LYRA },
      { user: LYRIA },
    ],
    bans: [{ user: BANNED }],
    users: [LEFT],
  })
}

test("an ID or a mention is the account itself, whether or not it is on the Discord server", async () => {
  const resolved = await resolveAccounts(server(), [
    LEFT.id,
    `<@${ALDIS.id}>`,
    `<@!${BANNED.id}>`,
  ])

  expect(resolved.get(LEFT.id)).toEqual({ kind: "account", id: LEFT.id })
  expect(resolved.get(`<@${ALDIS.id}>`)).toEqual({
    kind: "account",
    id: ALDIS.id,
  })
  expect(resolved.get(`<@!${BANNED.id}>`)).toEqual({
    kind: "account",
    id: BANNED.id,
  })
})

test("a name is the start of an account's username, global name or nickname, whatever its case", async () => {
  const resolved = await resolveAccounts(server(), [
    "ALD",
    "brynja_r",
    "Brynja la",
    "kor",
  ])

  expect(resolved.get("ALD")).toEqual({ kind: "account", id: ALDIS.id })
  expect(resolved.get("brynja_r")).toEqual({ kind: "account", id: BRYNJA.id })
  expect(resolved.get("Brynja la")).toEqual({ kind: "account", id: BRYNJA.id })
  expect(resolved.get("kor")).toEqual({ kind: "account", id: BANNED.id })
})

test("a name that no member and no banned account starts is none, an account that left without a ban included", async () => {
  const resolved = await resolveAccounts(server(), ["ingrid", "zzz", "ldis"])

  expect(resolved.get("ingrid")).toEqual({ kind: "none" })
  expect(resolved.get("zzz")).toEqual({ kind: "none" })
  expect(resolved.get("ldis")).toEqual({ kind: "none" })
})

test("a name that several accounts start is several, unless exactly one of them is called that", async () => {
  const resolved = await resolveAccounts(server(), ["ly", "lyria", "lyra"])

  expect(resolved.get("ly")).toEqual({ kind: "several" })
  expect(resolved.get("lyria")).toEqual({ kind: "account", id: LYRIA.id })
  expect(resolved.get("lyra")).toEqual({ kind: "account", id: LYRA.id })
})

test("a name that two accounts are exactly called is several", async () => {
  const discord = new FakeDiscord({
    members: [{ user: { id: ALDIS.id, username: "sam" } }],
    bans: [{ user: { id: BANNED.id, username: "sam" } }],
  })

  expect((await resolveAccounts(discord, ["sam"])).get("sam")).toEqual({
    kind: "several",
  })
})

test("with only IDs, the members and the bans are not read", async () => {
  const discord = new FakeDiscord()
  for (const [method, route] of [
    ["listMembers", "/guilds/{guild.id}/members"],
    ["listBans", "/guilds/{guild.id}/bans"],
  ] as const) {
    discord.failNext(
      method,
      new DiscordError({ method: "GET", route, status: 503 })
    )
  }

  const resolved = await resolveAccounts(discord, [ALDIS.id])

  expect(resolved.get(ALDIS.id)).toEqual({ kind: "account", id: ALDIS.id })
})
