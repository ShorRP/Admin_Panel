import { expect, test } from "vitest"

import {
  FakeDiscord,
  type FakeMember,
  type FakeRole,
  type FakeUser,
} from "@/discord/fake-discord"
import type { AccountListSearchParams } from "./account-list-filters"
import { listAccounts } from "./list-accounts"

function role(index: number, name: string, position: number): FakeRole {
  return {
    id: (BigInt("1300000000000000000") + BigInt(index)).toString(),
    name,
    position,
  }
}

function user(index: number, username: string): FakeUser {
  return {
    id: (BigInt("1400000000000000000") + BigInt(index)).toString(),
    username,
  }
}

function member(
  index: number,
  username: string,
  extra: Omit<FakeMember, "user"> = {}
): FakeMember {
  return { user: user(index, username), ...extra }
}

async function sorted(
  discord: FakeDiscord,
  searchParams: AccountListSearchParams
) {
  const list = await listAccounts(discord, searchParams, discord.listRoles())
  if (list.kind !== "page") {
    throw new Error(`Expected a page of accounts, not ${list.kind}.`)
  }
  return list.accounts.map(({ username }) => username)
}

function arrivals() {
  return new FakeDiscord({
    members: [
      member(1, "ancient", { joined_at: "2026-01-01T00:00:00.000Z" }),
      member(2, "recent", { joined_at: "2026-03-01T00:00:00.000Z" }),
      member(3, "middle", { joined_at: "2026-02-01T00:00:00.000Z" }),
      member(4, "alsorecent", { joined_at: "2026-03-01T00:00:00.000Z" }),
      member(5, "zed", { joined_at: null }),
      member(6, "ann", { joined_at: null }),
    ],
    bans: [{ user: user(7, "carl") }, { user: user(8, "bob") }],
  })
}

test("« Arrivée récente » puts the members who joined last first, two of the same moment by name, then the members with no arrival and the banned accounts by name", async () => {
  expect(await sorted(arrivals(), { sort: "joined-recent" })).toEqual([
    "alsorecent",
    "recent",
    "middle",
    "ancient",
    "ann",
    "bob",
    "carl",
    "zed",
  ])
})

test("« Arrivée ancienne » puts the members who joined first first, two of the same moment by name, the members with no arrival and the banned accounts still at the end", async () => {
  expect(await sorted(arrivals(), { sort: "joined-old" })).toEqual([
    "ancient",
    "middle",
    "alsorecent",
    "recent",
    "ann",
    "bob",
    "carl",
    "zed",
  ])
})

test("two accounts of the same moment and the same name are told apart by their ID, the lower first", async () => {
  const discord = new FakeDiscord({
    members: [
      member(2, "same", { joined_at: "2026-03-01T00:00:00.000Z" }),
      member(1, "same", { joined_at: "2026-03-01T00:00:00.000Z" }),
    ],
  })

  const list = await listAccounts(
    discord,
    { sort: "joined-old" },
    discord.listRoles()
  )

  expect(
    list.kind === "page" ? list.accounts.map(({ id }) => id.slice(-1)) : []
  ).toEqual(["1", "2"])
})

const SCRIBE = role(1, "Scribe", 7)

const GUARD = role(2, "Garde", 3)

const CITIZEN = role(3, "Citoyen", 1)

function ranked() {
  return new FakeDiscord({
    roles: [CITIZEN, SCRIBE, GUARD],
    members: [
      member(1, "dagny", { roles: [CITIZEN.id] }),
      member(2, "erik", { roles: [GUARD.id, SCRIBE.id] }),
      member(3, "brynja", { roles: [CITIZEN.id, GUARD.id] }),
      member(4, "zed"),
      member(5, "aldis", { roles: [SCRIBE.id] }),
      member(6, "corvus", { roles: ["1300000000000000099"] }),
      member(7, "fjord", { roles: [GUARD.id] }),
    ],
    bans: [{ user: user(8, "gunnar") }, { user: user(9, "alda") }],
  })
}

test("« Rôle le plus haut » ranks the members by the highest role they hold, two of the same role by name, then the members with no role by name, then the banned accounts by name", async () => {
  expect(await sorted(ranked(), { sort: "role" })).toEqual([
    "aldis",
    "erik",
    "brynja",
    "fjord",
    "dagny",
    "corvus",
    "zed",
    "alda",
    "gunnar",
  ])
})

test("sorting by arrival or by role leaves the accounts the filters kept, and the same order on each page", async () => {
  const discord = new FakeDiscord({
    roles: [SCRIBE, GUARD],
    members: Array.from({ length: 60 }, (_, index) =>
      member(index, `compte-${String(index).padStart(2, "0")}`, {
        roles: index % 3 === 0 ? [GUARD.id] : [SCRIBE.id],
        joined_at: new Date(
          Date.UTC(2026, 0, 1) + (index % 7) * 86_400_000
        ).toISOString(),
      })
    ),
  })

  const pages = await Promise.all(
    ["1", "2", "3"].map((page) =>
      sorted(discord, { sort: "joined-recent", page })
    )
  )

  expect(pages.flat()).toEqual(
    Array.from({ length: 60 }, (_, index) => index)
      .toSorted((left, right) => (right % 7) - (left % 7) || left - right)
      .map((index) => `compte-${String(index).padStart(2, "0")}`)
  )
  expect(await sorted(discord, { sort: "role", role: GUARD.id })).toEqual(
    Array.from({ length: 20 }, (_, index) => index * 3).map(
      (index) => `compte-${String(index).padStart(2, "0")}`
    )
  )
})

test("a sort that is not one of its choices, or repeated, sorts by name", async () => {
  expect(await sorted(arrivals(), { sort: "name" })).toEqual(
    await sorted(arrivals(), {})
  )
  expect(await sorted(arrivals(), { sort: ["role", "joined-old"] })).toEqual(
    await sorted(arrivals(), {})
  )
})
