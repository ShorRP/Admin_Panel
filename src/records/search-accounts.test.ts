import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { searchAccounts, searchedText } from "./search-accounts"

const ALDIS = {
  id: "1400000000000000001",
  username: "aldis",
  global_name: "Aldis",
}

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const CORVUS = {
  id: "1400000000000000003",
  username: "corvus",
  avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
}

const ALDA = {
  id: "1400000000000000004",
  username: "alda",
  global_name: "Alda la Noire",
  avatar: "6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c",
}

const HALDOR = { id: "1400000000000000005", username: "haldor" }

test("no search, or a blank one, looks for nothing", async () => {
  const discord = new FakeDiscord()

  expect(await searchAccounts(discord, undefined)).toEqual({ kind: "none" })
  expect(await searchAccounts(discord, "  ")).toEqual({ kind: "none" })
  expect(await searchAccounts(discord, ["aldis", "bryn"])).toEqual({
    kind: "none",
  })
})

test("an ID or a mention opens that account's record, member or not", async () => {
  const discord = new FakeDiscord()

  for (const query of [
    "1400000000000000002",
    " 1400000000000000002 ",
    "<@1400000000000000002>",
    "<@!1400000000000000002>",
  ]) {
    expect(await searchAccounts(discord, query)).toEqual({
      kind: "record",
      userId: "1400000000000000002",
    })
  }
})

test("a search finds the members whose username or nickname starts with it, whatever its case, then the banned accounts whose username does", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: ALDIS },
      { user: BRYNJA },
      { user: CORVUS, nick: "Aldric le Sage" },
    ],
    bans: [{ user: ALDA, reason: "spam" }, { user: HALDOR }],
  })

  expect(await searchAccounts(discord, " ALD ")).toEqual({
    kind: "accounts",
    query: "ALD",
    accounts: [
      {
        id: ALDIS.id,
        name: "Aldis",
        username: "aldis",
        avatarUrl: null,
        banned: false,
      },
      {
        id: CORVUS.id,
        name: "Aldric le Sage",
        username: "corvus",
        avatarUrl:
          "https://cdn.discordapp.com/avatars/1400000000000000003/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
        banned: false,
      },
      {
        id: ALDA.id,
        name: "Alda la Noire",
        username: "alda",
        avatarUrl:
          "https://cdn.discordapp.com/avatars/1400000000000000004/6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c.webp?size=64",
        banned: true,
      },
    ],
    truncated: false,
  })
})

test("a search finds banned accounts beyond the first 1,000 bans Discord lists at once", async () => {
  const bans = Array.from({ length: 1000 }, (_, index) => ({
    user: {
      id: (BigInt("1300000000000000000") + BigInt(index)).toString(),
      username: `banni${index}`,
    },
  }))
  const discord = new FakeDiscord({ bans: [...bans, { user: HALDOR }] })

  const search = await searchAccounts(discord, "hal")

  expect(search).toMatchObject({
    accounts: [{ id: HALDOR.id, username: "haldor", banned: true }],
  })
})

function accounts(count: number, idStart: string, username: string) {
  return Array.from({ length: count }, (_, index) => ({
    user: {
      id: (BigInt(idStart) + BigInt(index)).toString(),
      username: `${username}${index}`,
    },
  }))
}

test("a search shows 25 accounts at most, members first, and says when it left some out", async () => {
  const discord = new FakeDiscord({
    members: accounts(20, "1400000000000000100", "ald"),
    bans: accounts(10, "1400000000000000200", "ald"),
  })

  const search = await searchAccounts(discord, "ald")

  expect(search).toMatchObject({ kind: "accounts", truncated: true })
  const found = search.kind === "accounts" ? search.accounts : []
  expect(found).toHaveLength(25)
  expect(found.filter(({ banned }) => banned)).toHaveLength(5)
})

test("a search that finds 25 accounts exactly leaves none out", async () => {
  const discord = new FakeDiscord({
    members: accounts(25, "1400000000000000100", "ald"),
  })

  const search = await searchAccounts(discord, "ald")

  expect(search).toMatchObject({ kind: "accounts", truncated: false })
  expect(search.kind === "accounts" ? search.accounts : []).toHaveLength(25)
})

test("a search that finds more than 25 members says it left some out", async () => {
  const discord = new FakeDiscord({
    members: accounts(26, "1400000000000000100", "ald"),
  })

  expect(await searchAccounts(discord, "ald")).toMatchObject({
    kind: "accounts",
    truncated: true,
  })
})

test("the search field shows what was searched, as typed, or nothing", () => {
  expect(searchedText(" ald")).toBe(" ald")
  expect(searchedText(undefined)).toBe("")
  expect(searchedText(["ald", "bryn"])).toBe("")
})
