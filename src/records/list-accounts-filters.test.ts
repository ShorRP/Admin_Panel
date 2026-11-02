import { expect, onTestFinished, test, vi } from "vitest"

import {
  FakeDiscord,
  type FakeMember,
  type FakeRole,
  type FakeUser,
} from "@/discord/fake-discord"
import type { AccountListSearchParams } from "./account-list-filters"
import { listAccounts } from "./list-accounts"

const NOW = new Date("2026-11-02T12:00:00.000Z")

const DISCORD_EPOCH_MS = 1420070400000

function freezeTime(now = NOW) {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(now)
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

function role(index: number, name: string, position: number): FakeRole {
  return {
    id: (BigInt("1300000000000000000") + BigInt(index)).toString(),
    name,
    position,
  }
}

function snowflakeAt(moment: string, index: number) {
  return (
    (BigInt(Date.parse(moment) - DISCORD_EPOCH_MS) << BigInt(22)) +
    BigInt(index)
  ).toString()
}

function user(index: number, username: string, extra: Partial<FakeUser> = {}) {
  return {
    id: (BigInt("1400000000000000000") + BigInt(index)).toString(),
    username,
    ...extra,
  }
}

function member(
  index: number,
  username: string,
  extra: Omit<FakeMember, "user"> & { user?: Partial<FakeUser> } = {}
): FakeMember {
  const { user: userExtra, ...rest } = extra
  return { user: user(index, username, userExtra), ...rest }
}

async function listed(
  discord: FakeDiscord,
  searchParams: AccountListSearchParams = {}
) {
  const list = await listAccounts(discord, searchParams, discord.listRoles())
  if (list.kind !== "page") {
    throw new Error(`Expected a page of accounts, not ${list.kind}.`)
  }
  return list
}

async function usernames(
  discord: FakeDiscord,
  searchParams: AccountListSearchParams = {}
) {
  return (await listed(discord, searchParams)).accounts.map(
    ({ username }) => username
  )
}

const GUARD = role(1, "Garde", 3)

const SCRIBE = role(2, "Scribe", 7)

const CITIZEN = role(3, "Citoyen", 1)

function roledServer() {
  return new FakeDiscord({
    roles: [GUARD, SCRIBE, CITIZEN],
    members: [
      member(1, "aldis", { roles: [GUARD.id] }),
      member(2, "brynja", { roles: [CITIZEN.id, GUARD.id, SCRIBE.id] }),
      member(3, "corvus", { roles: [CITIZEN.id] }),
      member(4, "dagny"),
      member(5, "erik", { roles: ["1300000000000000099"] }),
    ],
    bans: [{ user: user(6, "fjord") }],
  })
}

test("a role filter keeps the members who hold the role among all theirs, and drops the banned accounts", async () => {
  const discord = roledServer()

  expect(await usernames(discord, { role: GUARD.id })).toEqual([
    "aldis",
    "brynja",
  ])
  expect(await usernames(discord, { role: CITIZEN.id })).toEqual([
    "brynja",
    "corvus",
  ])
  expect(await usernames(discord, { role: SCRIBE.id })).toEqual(["brynja"])
})

test("« Aucun rôle » keeps the members who hold no role the Discord server lists, and drops the banned accounts", async () => {
  const discord = roledServer()

  expect(await usernames(discord, { role: "none" })).toEqual(["dagny", "erik"])
})

test("a role the Discord server does not list, or @everyone, counts as no role filter, and so does a repeated role", async () => {
  const discord = roledServer()
  const everyone = discord.guildId

  for (const role of ["1300000000000000099", everyone, "abc", "", ["a", "b"]]) {
    const list = await listed(discord, { role })
    expect(list.filters.role, JSON.stringify(role)).toBeNull()
    expect(list.total, JSON.stringify(role)).toBe(6)
  }
  expect((await listed(discord, { role: GUARD.id })).filters.role).toBe(
    GUARD.id
  )
  expect((await listed(discord, { role: "none" })).filters.role).toBe("none")
})

test("the state filter « Membres » keeps every member, timed out or not, « Exclus en ce moment » the members whose timeout runs, and « Bannis » the banned accounts", async () => {
  freezeTime()
  const discord = new FakeDiscord({
    members: [
      member(1, "aldis", {
        communication_disabled_until: "2026-11-02T12:00:00.001Z",
      }),
      member(2, "brynja", {
        communication_disabled_until: "2026-11-02T12:00:00.000Z",
      }),
      member(3, "corvus"),
    ],
    bans: [{ user: user(4, "dagny") }],
  })

  expect(await usernames(discord, { standing: "members" })).toEqual([
    "aldis",
    "brynja",
    "corvus",
  ])
  expect(await usernames(discord, { standing: "timed-out" })).toEqual(["aldis"])
  expect(await usernames(discord, { standing: "banned" })).toEqual(["dagny"])
  expect(await usernames(discord, {})).toEqual([
    "aldis",
    "brynja",
    "corvus",
    "dagny",
  ])
})

const DAY_MS = 24 * 60 * 60 * 1000

function joinedAt(offsetMs: number) {
  return new Date(NOW.getTime() - offsetMs).toISOString()
}

test("the arrival filters keep the members who joined within the last 7 days or 30 days, the bound itself included, and drop a member with no arrival and the banned accounts", async () => {
  freezeTime()
  const discord = new FakeDiscord({
    members: [
      member(1, "within-7d", { joined_at: joinedAt(7 * DAY_MS) }),
      member(2, "past-7d", { joined_at: joinedAt(7 * DAY_MS + 1) }),
      member(3, "within-30d", { joined_at: joinedAt(30 * DAY_MS) }),
      member(4, "past-30d", { joined_at: joinedAt(30 * DAY_MS + 1) }),
      member(5, "today", { joined_at: joinedAt(0) }),
      member(6, "no-arrival", { joined_at: null }),
    ],
    bans: [{ user: user(7, "banned") }],
  })

  expect(await usernames(discord, { joined: "7d" })).toEqual([
    "today",
    "within-7d",
  ])
  expect(await usernames(discord, { joined: "30d" })).toEqual([
    "past-7d",
    "today",
    "within-30d",
    "within-7d",
  ])
})

test("« 6 derniers mois » counts six calendar months back from now, the bound itself included", async () => {
  freezeTime()
  const discord = new FakeDiscord({
    members: [
      member(1, "on-the-bound", { joined_at: "2026-05-02T12:00:00.000Z" }),
      member(2, "just-before", { joined_at: "2026-05-02T11:59:59.999Z" }),
      member(3, "in-the-middle", { joined_at: "2026-07-20T00:00:00.000Z" }),
      member(4, "180-days-ago", { joined_at: joinedAt(180 * DAY_MS) }),
      member(5, "no-arrival", { joined_at: null }),
    ],
    bans: [{ user: user(6, "banned") }],
  })

  expect(await usernames(discord, { joined: "6m" })).toEqual([
    "180-days-ago",
    "in-the-middle",
    "on-the-bound",
  ])
})

test("« 6 derniers mois » from the end of a month falls on the last day of the earlier month", async () => {
  freezeTime(new Date("2026-08-31T12:00:00.000Z"))
  const discord = new FakeDiscord({
    members: [
      member(1, "on-the-bound", { joined_at: "2026-02-28T12:00:00.000Z" }),
      member(2, "just-before", { joined_at: "2026-02-28T11:59:59.999Z" }),
    ],
  })

  expect(await usernames(discord, { joined: "6m" })).toEqual(["on-the-bound"])
})

test("« Plus d’un an » keeps the members who joined before the same date a year earlier, the bound itself left out, and drops a member with no arrival and the banned accounts", async () => {
  freezeTime()
  const discord = new FakeDiscord({
    members: [
      member(1, "on-the-bound", { joined_at: "2025-11-02T12:00:00.000Z" }),
      member(2, "just-before", { joined_at: "2025-11-02T11:59:59.999Z" }),
      member(3, "long-ago", { joined_at: "2019-04-01T00:00:00.000Z" }),
      member(4, "this-year", { joined_at: "2026-01-01T00:00:00.000Z" }),
      member(5, "no-arrival", { joined_at: null }),
    ],
    bans: [{ user: user(6, "banned") }],
  })

  expect(await usernames(discord, { joined: "over-1y" })).toEqual([
    "just-before",
    "long-ago",
  ])
})

test("the year back from February 29 is February 28", async () => {
  freezeTime(new Date("2028-02-29T12:00:00.000Z"))
  const discord = new FakeDiscord({
    members: [
      member(1, "on-the-bound", { joined_at: "2027-02-28T12:00:00.000Z" }),
      member(2, "just-before", { joined_at: "2027-02-28T11:59:59.999Z" }),
    ],
  })

  expect(await usernames(discord, { joined: "over-1y" })).toEqual([
    "just-before",
  ])
})

test("the account age filters read the creation date in the ID, for a member and for a banned account, the bound itself included", async () => {
  freezeTime()
  const created = (moment: string, index: number, username: string) => ({
    id: snowflakeAt(moment, index),
    username,
  })
  const discord = new FakeDiscord({
    members: [
      { user: created("2026-10-26T12:00:00.000Z", 1, "member-7d") },
      { user: created("2026-10-26T11:59:59.999Z", 2, "member-past-7d") },
      { user: created("2026-10-03T12:00:00.000Z", 3, "member-30d") },
      { user: created("2026-10-03T11:59:59.999Z", 4, "member-past-30d") },
    ],
    bans: [
      { user: created("2026-11-01T00:00:00.000Z", 5, "banned-new") },
      { user: created("2020-01-01T00:00:00.000Z", 6, "banned-old") },
    ],
  })

  expect(await usernames(discord, { created: "7d" })).toEqual([
    "banned-new",
    "member-7d",
  ])
  expect(await usernames(discord, { created: "30d" })).toEqual([
    "banned-new",
    "member-30d",
    "member-7d",
    "member-past-7d",
  ])
})

test("bots are left out unless the staff ask for them, the application's own account and a banned bot among them", async () => {
  const discord = new FakeDiscord({
    members: [
      member(1, "aldis"),
      member(2, "helper-bot", { user: { bot: true } }),
    ],
    bans: [
      { user: user(3, "corvus") },
      { user: user(4, "banned-bot", { bot: true }) },
    ],
  })

  expect(await usernames(discord)).toEqual(["aldis", "corvus"])
  expect(await usernames(discord, { bots: "shown" })).toEqual([
    "aldis",
    "banned-bot",
    "corvus",
    "helper-bot",
    "Shor Panel",
  ])
  expect(await usernames(discord, { bots: "hidden" })).toEqual([
    "aldis",
    "corvus",
  ])
  expect((await listed(discord, { bots: "hidden" })).filters.bots).toBeNull()
  expect((await listed(discord, { bots: "shown" })).filters.bots).toBe("shown")
})

test("the filters combine, each one keeping only the accounts the others kept, the search among them", async () => {
  freezeTime()
  const discord = new FakeDiscord({
    roles: [GUARD, CITIZEN],
    members: [
      member(1, "aldis", {
        roles: [GUARD.id],
        joined_at: joinedAt(3 * DAY_MS),
      }),
      member(2, "alda", {
        roles: [GUARD.id],
        joined_at: joinedAt(300 * DAY_MS),
      }),
      member(3, "aldric", {
        roles: [CITIZEN.id],
        joined_at: joinedAt(3 * DAY_MS),
      }),
      member(4, "brynja", {
        roles: [GUARD.id],
        joined_at: joinedAt(3 * DAY_MS),
      }),
      member(5, "aldora", {
        roles: [GUARD.id],
        joined_at: joinedAt(3 * DAY_MS),
        communication_disabled_until: "2099-11-02T18:30:00.000000+00:00",
      }),
    ],
    bans: [{ user: user(6, "aldwin") }],
  })

  expect(await usernames(discord, { role: GUARD.id })).toEqual([
    "alda",
    "aldis",
    "aldora",
    "brynja",
  ])
  expect(await usernames(discord, { role: GUARD.id, joined: "30d" })).toEqual([
    "aldis",
    "aldora",
    "brynja",
  ])
  expect(
    await usernames(discord, {
      role: GUARD.id,
      joined: "30d",
      query: "ald",
    })
  ).toEqual(["aldis", "aldora"])
  expect(
    await usernames(discord, {
      role: GUARD.id,
      joined: "30d",
      query: "ald",
      standing: "timed-out",
    })
  ).toEqual(["aldora"])
  expect(
    await usernames(discord, {
      role: GUARD.id,
      joined: "30d",
      query: "ald",
      standing: "banned",
    })
  ).toEqual([])
})

test("a filter that is not one of its choices counts as absent, a repeated one too, and the filters kept are the valid ones", async () => {
  const discord = roledServer()

  const list = await listed(discord, {
    query: ["a", "b"],
    standing: "everyone",
    joined: ["7d", "30d"],
    created: "1y",
    bots: "yes",
    sort: "name",
  })

  expect(list.filters).toEqual({
    query: null,
    role: null,
    standing: null,
    joined: null,
    created: null,
    bots: null,
    sort: null,
  })
  expect(list.total).toBe(6)
})

test("the filters a page is read with come back as they were valid, whatever the order they were given in", async () => {
  const discord = roledServer()

  const list = await listed(discord, {
    sort: "role",
    bots: "shown",
    created: "30d",
    joined: "over-1y",
    standing: "members",
    role: GUARD.id,
    query: "  ald ",
    page: "1",
  })

  expect(list.filters).toEqual({
    query: "ald",
    role: GUARD.id,
    standing: "members",
    joined: "over-1y",
    created: "30d",
    bots: "shown",
    sort: "role",
  })
})

test("the total counts the accounts kept, and the pages are those of the accounts kept", async () => {
  const members = Array.from({ length: 70 }, (_, index) =>
    member(index, `compte-${String(index).padStart(3, "0")}`, {
      roles: index % 2 === 0 ? [GUARD.id] : [],
    })
  )
  const discord = new FakeDiscord({ roles: [GUARD], members })

  const second = await listed(discord, { role: GUARD.id, page: "2" })

  expect(second).toMatchObject({
    page: 2,
    pages: 2,
    first: 26,
    last: 35,
    total: 35,
  })
  expect(second.accounts.map(({ username }) => username)).toEqual(
    members
      .filter((_, index) => index % 2 === 0)
      .slice(25)
      .map(({ user }) => user.username)
  )
})

test("without a filter that keeps any account, the page is empty and the first", async () => {
  const discord = roledServer()

  const empty = await listed(discord, { role: SCRIBE.id, standing: "banned" })

  expect(empty).toMatchObject({
    page: 1,
    pages: 1,
    first: 0,
    last: 0,
    total: 0,
    accounts: [],
  })
})
