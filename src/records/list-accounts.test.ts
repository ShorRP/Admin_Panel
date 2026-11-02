import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import {
  FakeDiscord,
  type FakeRole,
  type FakeUser,
} from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { isPanelError } from "@/monitoring/panel-error"
import type { AccountListSearchParams } from "./account-list-filters"
import { listAccounts, type AccountListPage } from "./list-accounts"

const MISSING_ACCESS = new DiscordError({
  method: "GET",
  route: ROUTES.guildMembers,
  status: 403,
  code: 50001,
  discordMessage: "Missing Access",
})

function role(
  index: number,
  name: string,
  position: number,
  primaryColor = 0
): FakeRole {
  return {
    id: (BigInt("1300000000000000000") + BigInt(index)).toString(),
    name,
    position,
    colors: {
      primary_color: primaryColor,
      secondary_color: null,
      tertiary_color: null,
    },
  }
}

function user(index: number, username: string): FakeUser {
  return {
    id: (BigInt("1400000000000000000") + BigInt(index)).toString(),
    username,
  }
}

function numbered(count: number, kind: "even" | "odd" | "all") {
  return Array.from({ length: count }, (_, index) => index)
    .filter(
      (index) =>
        kind === "all" || (kind === "even" ? index % 2 === 0 : index % 2 === 1)
    )
    .map((index) => user(index, `compte-${String(index).padStart(4, "0")}`))
}

function sixtyAccounts() {
  return new FakeDiscord({
    members: numbered(60, "even").map((member) => ({ user: member })),
    bans: numbered(60, "odd").map((ban) => ({ user: ban })),
  })
}

async function listResult(
  discord: FakeDiscord,
  searchParams: AccountListSearchParams = {}
) {
  return await listAccounts(discord, searchParams, discord.listRoles())
}

async function listPage(
  discord: FakeDiscord,
  searchParams: AccountListSearchParams = {}
) {
  const list = await listResult(discord, searchParams)
  if (list.kind !== "page") {
    throw new Error(`Expected a page of accounts, not ${list.kind}.`)
  }
  return list
}

function usernamesOf({ accounts }: AccountListPage) {
  return accounts.map(({ username }) => username)
}

function summary({ accounts, ...rest }: AccountListPage) {
  return { ...rest, usernames: accounts.map(({ username }) => username) }
}

const NO_FILTERS = {
  query: null,
  role: null,
  standing: null,
  joined: null,
  created: null,
  bots: null,
  sort: null,
}

test("with nothing searched, the first page holds 25 accounts, members and banned accounts mixed by name, with the exact total, bot accounts left out", async () => {
  const first = await listPage(sixtyAccounts())

  expect(summary(first)).toEqual({
    kind: "page",
    filters: NO_FILTERS,
    page: 1,
    pages: 3,
    first: 1,
    last: 25,
    total: 60,
    usernames: numbered(25, "all").map(({ username }) => username),
  })
  expect(first.accounts.map(({ standing }) => standing.kind)).toEqual(
    first.accounts.map((_, index) => (index % 2 === 0 ? "member" : "banned"))
  )
})

test("a page of the middle holds the next 25 accounts, ranked from 26 to 50", async () => {
  const second = await listPage(sixtyAccounts(), { page: "2" })

  expect(second).toMatchObject({ page: 2, pages: 3, first: 26, last: 50 })
  expect(second.accounts.map(({ username }) => username)).toEqual(
    numbered(50, "all")
      .slice(25)
      .map(({ username }) => username)
  )
})

test("the last page holds what is left, ranked to the total", async () => {
  const last = await listPage(sixtyAccounts(), { page: "3" })

  expect(summary(last)).toMatchObject({
    page: 3,
    pages: 3,
    first: 51,
    last: 60,
    total: 60,
  })
  expect(usernamesOf(last)).toEqual(
    numbered(60, "all")
      .slice(50)
      .map(({ username }) => username)
  )
})

test("a page that is not an integer from 1 to the last page counts as absent, and gives the first", async () => {
  const discord = sixtyAccounts()

  for (const invalid of [
    undefined,
    "",
    "abc",
    "0",
    "-1",
    "1.5",
    "2e1",
    " 2",
    "4",
    "99999999999999999999",
    ["2", "3"],
    ["2"],
    2,
  ]) {
    expect(
      await listPage(discord, { page: invalid }),
      JSON.stringify(invalid)
    ).toMatchObject({
      page: 1,
      first: 1,
      last: 25,
    })
  }
  expect(await listPage(discord, { page: "1" })).toMatchObject({ page: 1 })
  expect(await listPage(discord, { page: "03" })).toMatchObject({ page: 3 })
})

test("more than 1,000 members are read in several pages, and every one is counted", async () => {
  const discord = new FakeDiscord({
    members: numbered(2300, "all").map((member) => ({ user: member })),
  })

  const last = await listPage(discord, { page: "92" })

  expect(summary(last)).toMatchObject({
    page: 92,
    pages: 92,
    first: 2276,
    last: 2300,
    total: 2300,
  })
  expect(usernamesOf(last).at(-1)).toBe("compte-2299")
})

test("1,000 members exactly are read to the end, and so are 1,000 bans past them", async () => {
  const members = new FakeDiscord({
    members: numbered(999, "all").map((member) => ({ user: member })),
  })
  const bans = new FakeDiscord({
    bans: numbered(1000, "all").map((ban) => ({ user: ban })),
  })

  expect(await listPage(members, { bots: "shown" })).toMatchObject({
    total: 1000,
    pages: 40,
  })
  expect(await listPage(bans)).toMatchObject({ total: 1000, pages: 40 })
})

test("accounts sort by the name they show, whatever its case, a member by nickname, then global name, then username, a banned account by global name, then username, then by ID", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: user(1, "zed"), nick: "alda" },
      { user: { ...user(2, "x"), global_name: "Brynja" } },
      { user: user(3, "CORVUS"), nick: "dagny" },
      {
        user: { ...user(4, "ignored"), global_name: "ignored" },
        nick: "Éclair",
      },
      { user: user(5, "aldis") },
      { user: user(7, "HALDOR") },
    ],
    bans: [
      { user: { ...user(6, "y"), global_name: "Alda" } },
      { user: user(8, "Brynja") },
      { user: user(9, "alda") },
    ],
  })

  const list = await listPage(discord)

  expect(list.accounts.map(({ id, name }) => [name, id.slice(-1)])).toEqual([
    ["alda", "1"],
    ["Alda", "6"],
    ["alda", "9"],
    ["aldis", "5"],
    ["Brynja", "2"],
    ["Brynja", "8"],
    ["dagny", "3"],
    ["Éclair", "4"],
    ["HALDOR", "7"],
  ])
})

test("each account keeps its username, its avatar and its standing, a member's timeout counting only while it runs", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: {
          ...user(1, "aldis"),
          avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
        },
        avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
        communication_disabled_until: "2099-11-02T18:30:00.000000+00:00",
      },
      {
        user: user(2, "brynja"),
        communication_disabled_until: "2026-01-02T18:30:00.000000+00:00",
      },
    ],
    bans: [
      {
        user: {
          ...user(3, "corvus"),
          avatar: "6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c",
        },
      },
    ],
  })

  const list = await listPage(discord)

  expect(list.accounts.slice(0, 3)).toEqual([
    {
      id: user(1, "").id,
      name: "aldis",
      username: "aldis",
      avatarUrl: `https://cdn.discordapp.com/guilds/${discord.guildId}/users/${user(1, "").id}/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64`,
      standing: {
        kind: "member",
        timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
      },
      highestRole: null,
    },
    {
      id: user(2, "").id,
      name: "brynja",
      username: "brynja",
      avatarUrl: null,
      standing: { kind: "member", timedOutUntil: null },
      highestRole: null,
    },
    {
      id: user(3, "").id,
      name: "corvus",
      username: "corvus",
      avatarUrl: `https://cdn.discordapp.com/avatars/${user(3, "").id}/6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c.webp?size=64`,
      standing: { kind: "banned" },
      highestRole: null,
    },
  ])
})

test("a member's highest role is the one of the highest position among theirs, whatever the order the roles are held in or listed in, with its name and its color", async () => {
  const guard = role(1, "Garde", 3, 0x2ecc71)
  const scribe = role(2, "Scribe", 7, 0xe67e22)
  const citizen = role(3, "Citoyen", 1, 0x3498db)
  const outsider = role(4, "Étranger", 9, 0xff0000)
  const discord = new FakeDiscord({
    roles: [guard, outsider, citizen, scribe],
    members: [
      { user: user(1, "aldis"), roles: [citizen.id, scribe.id, guard.id] },
      { user: user(2, "brynja"), roles: [guard.id, citizen.id] },
      { user: user(3, "corvus"), roles: [citizen.id] },
    ],
  })

  const list = await listPage(discord)

  expect(
    list.accounts
      .slice(0, 3)
      .map(({ username, highestRole }) => [username, highestRole])
  ).toEqual([
    ["aldis", { name: "Scribe", color: "#e67e22" }],
    ["brynja", { name: "Garde", color: "#2ecc71" }],
    ["corvus", { name: "Citoyen", color: "#3498db" }],
  ])
})

test("two roles of the same position are told apart by their ID, the lower one the higher", async () => {
  const older = role(1, "Ancien", 4, 0x112233)
  const newer = role(2, "Récent", 4, 0x445566)
  const discord = new FakeDiscord({
    roles: [newer, older],
    members: [
      { user: user(1, "aldis"), roles: [newer.id, older.id] },
      { user: user(2, "brynja"), roles: [older.id, newer.id] },
    ],
  })

  const list = await listPage(discord)

  expect(
    list.accounts.slice(0, 2).map(({ highestRole }) => highestRole)
  ).toEqual([
    { name: "Ancien", color: "#112233" },
    { name: "Ancien", color: "#112233" },
  ])
})

test("a member with no role, or with only roles the Discord server no longer lists, has no highest role", async () => {
  const guard = role(1, "Garde", 3, 0x2ecc71)
  const discord = new FakeDiscord({
    roles: [guard],
    members: [
      { user: user(1, "aldis") },
      { user: user(2, "brynja"), roles: ["1300000000000000099"] },
    ],
  })

  const list = await listPage(discord)

  expect(
    list.accounts.slice(0, 2).map(({ highestRole }) => highestRole)
  ).toEqual([null, null])
})

test("a banned account has no highest role", async () => {
  const discord = new FakeDiscord({
    roles: [role(1, "Garde", 3, 0x2ecc71)],
    bans: [{ user: user(1, "aldis") }],
  })

  const list = await listPage(discord)

  expect(list.accounts[0]).toMatchObject({
    username: "aldis",
    standing: { kind: "banned" },
    highestRole: null,
  })
})

test("a role's color is its primary color written as six hexadecimal digits, and none when it is 0, its secondary and tertiary colors ignored", async () => {
  const gradient: FakeRole = {
    ...role(1, "Dégradé", 5, 0xe67e22),
    colors: {
      primary_color: 0xe67e22,
      secondary_color: 0x3498db,
      tertiary_color: 0x2ecc71,
    },
  }
  const dark = role(2, "Ombre", 4, 0x00000f)
  const plain = role(3, "Ordinaire", 3)
  const discord = new FakeDiscord({
    roles: [gradient, dark, plain],
    members: [
      { user: user(1, "aldis"), roles: [gradient.id] },
      { user: user(2, "brynja"), roles: [dark.id] },
      { user: user(3, "corvus"), roles: [plain.id] },
    ],
  })

  const list = await listPage(discord)

  expect(
    list.accounts.slice(0, 3).map(({ highestRole }) => highestRole)
  ).toEqual([
    { name: "Dégradé", color: "#e67e22" },
    { name: "Ombre", color: "#00000f" },
    { name: "Ordinaire", color: null },
  ])
})

test("the highest role of a member is shown though it has no color, whatever the colors of the roles below it", async () => {
  const plain = role(1, "Ordinaire", 5)
  const colored = role(2, "Coloré", 2, 0xe67e22)
  const discord = new FakeDiscord({
    roles: [plain, colored],
    members: [{ user: user(1, "aldis"), roles: [colored.id, plain.id] }],
  })

  const list = await listPage(discord)

  expect(list.accounts[0]?.highestRole).toEqual({
    name: "Ordinaire",
    color: null,
  })
})

test("a roles' list Discord refuses is thrown, so that the page fails as when the members' list is refused", async () => {
  const discord = sixtyAccounts()
  discord.failNext("listRoles", MISSING_ACCESS)

  await expect(listPage(discord)).rejects.toBe(MISSING_ACCESS)
})

test("an ID or a mention gives the record whatever the page, though the members' list cannot be read", async () => {
  const discord = sixtyAccounts()
  discord.failNext("listMembers", MISSING_ACCESS)

  for (const query of [
    "1400000000000000002",
    " 1400000000000000002 ",
    "<@1400000000000000002>",
    "<@!1400000000000000002>",
  ]) {
    expect(await listResult(discord, { query, page: "2" })).toEqual({
      kind: "record",
      userId: "1400000000000000002",
    })
  }
  await expect(listPage(discord)).rejects.toBe(MISSING_ACCESS)
})

test("an ID or a mention gives the record whatever the filters, though the roles' list cannot be read, the roles' promise never awaited", async () => {
  const discord = sixtyAccounts()
  discord.failNext("listRoles", MISSING_ACCESS)
  const roles = discord.listRoles()
  roles.catch(() => undefined)

  expect(
    await listAccounts(
      discord,
      { query: "<@1400000000000000002>", role: "none", standing: "banned" },
      roles
    )
  ).toEqual({ kind: "record", userId: "1400000000000000002" })
})

test("a blank or repeated search lists the accounts as if nothing was searched", async () => {
  const discord = sixtyAccounts()

  expect(await listPage(discord, { query: "  " })).toMatchObject({
    total: 60,
    filters: { query: null },
  })
  expect(await listPage(discord, { query: ["a", "b"] })).toMatchObject({
    total: 60,
    filters: { query: null },
  })
})

test("a members' list Discord refuses for want of the Server Members Intent is thrown as a panel error", async () => {
  const discord = sixtyAccounts()
  discord.failNext("listMembers", MISSING_ACCESS)

  const failure = await listResult(discord).catch((error: unknown) => error)

  expect(failure).toBe(MISSING_ACCESS)
  expect(isPanelError(failure)).toBe(true)
})

function searched(discord: FakeDiscord, query: string) {
  return listPage(discord, { query }).then(usernamesOf)
}

test("a search keeps the accounts whose username, global name or nickname starts with the text, whatever the case of either", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: user(1, "ALDIS") },
      { user: { ...user(2, "x"), global_name: "Aldora" } },
      { user: user(3, "corvus"), nick: "Alduin le Sage" },
      { user: user(4, "haldor") },
      { user: user(5, "brynja"), nick: "Garde" },
    ],
  })

  expect(await searched(discord, "ald")).toEqual(["ALDIS", "x", "corvus"])
  expect(await searched(discord, "ALD")).toEqual(["ALDIS", "x", "corvus"])
  expect(await searched(discord, "alduin")).toEqual(["corvus"])
  expect(await searched(discord, "aldor")).toEqual(["x"])
  expect(await searched(discord, "dor")).toEqual([])
})

test("a search also finds a banned account, by its username or its global name, though it has no nickname", async () => {
  const discord = new FakeDiscord({
    members: [{ user: user(1, "aldis") }],
    bans: [
      { user: user(2, "ALDRIC") },
      { user: { ...user(3, "y"), global_name: "Aldora" } },
      { user: user(4, "corvus") },
    ],
  })

  const found = await listPage(discord, { query: "ald" })

  expect(
    found.accounts.map(({ username, standing }) => [username, standing.kind])
  ).toEqual([
    ["aldis", "member"],
    ["y", "banned"],
    ["ALDRIC", "banned"],
  ])
})

test("a search matches the start of a name, not a part of it, after the spaces around the text are left out, and a name with spaces by its start", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: user(1, "x"), nick: "Alda la Noire" },
      { user: user(2, "y"), nick: "La Alda" },
    ],
  })

  expect(await searched(discord, "  alda l  ")).toEqual(["x"])
  expect(await searched(discord, "noire")).toEqual([])
})

test("the results of a search are counted and paged like the list, with no cap of 25", async () => {
  const discord = sixtyAccounts()

  const first = await listPage(discord, { query: "compte-00" })
  const second = await listPage(discord, { query: "compte-00", page: "2" })

  expect(summary(first)).toMatchObject({
    first: 1,
    last: 25,
    total: 60,
    pages: 3,
    filters: { query: "compte-00" },
  })
  expect(second).toMatchObject({ page: 2, first: 26, last: 50, total: 60 })
  expect(usernamesOf(second)[0]).toBe("compte-0025")
})

test("a search that matches nothing gives an empty page, whatever the page asked for", async () => {
  const empty = await listPage(sixtyAccounts(), {
    query: "zzz",
    page: "3",
  })

  expect(summary(empty)).toMatchObject({
    page: 1,
    pages: 1,
    first: 0,
    last: 0,
    total: 0,
    usernames: [],
  })
})
