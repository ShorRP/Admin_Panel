import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { readRecord } from "./read-record"

const LYRA = {
  id: "175928847299117063",
  username: "lyra_gates",
  global_name: "Lyra",
}

const LYRA_CREATED_AT = new Date("2016-04-30T11:18:25.796Z")

const GUARD = { id: "1300000000000000010", name: "Garde", position: 2 }

const PLAYER = { id: "1300000000000000011", name: "Joueur", position: 1 }

const COUNCIL = { id: "1300000000000000012", name: "Conseil", position: 5 }

test("a member's record holds their names, ID, account creation, arrival on the Discord server and roles, highest first", async () => {
  const discord = new FakeDiscord({
    roles: [GUARD, PLAYER, COUNCIL],
    members: [
      {
        user: LYRA,
        nick: "Lyra des Brumes",
        roles: [PLAYER.id, GUARD.id],
        joined_at: "2026-03-14T09:26:53.589000+00:00",
      },
    ],
  })

  expect(await readRecord(discord, LYRA.id)).toEqual({
    id: LYRA.id,
    name: "Lyra des Brumes",
    nick: "Lyra des Brumes",
    globalName: "Lyra",
    username: "lyra_gates",
    avatarUrl: null,
    createdAt: LYRA_CREATED_AT,
    standing: {
      kind: "member",
      joinedAt: new Date("2026-03-14T09:26:53.589Z"),
      roles: [
        { id: GUARD.id, name: "Garde" },
        { id: PLAYER.id, name: "Joueur" },
      ],
      timedOutUntil: null,
    },
  })
})

test("a member's timeout shows until it ends, and no longer once it has ended", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: LYRA,
        communication_disabled_until: "2099-11-02T18:30:00.000000+00:00",
      },
      {
        user: { id: "1400000000000000002", username: "brynja" },
        communication_disabled_until: "2026-01-02T18:30:00.000000+00:00",
      },
    ],
  })

  expect((await readRecord(discord, LYRA.id))?.standing).toMatchObject({
    kind: "member",
    timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
  })
  expect(
    (await readRecord(discord, "1400000000000000002"))?.standing
  ).toMatchObject({ kind: "member", timedOutUntil: null })
})

test("a banned account's record holds the reason Discord keeps, and names the staff member when the reason is in the panel's format", async () => {
  const corvus = { id: "1400000000000000003", username: "corvus" }
  const brynja = { id: "1400000000000000002", username: "brynja" }
  const discord = new FakeDiscord({
    bans: [
      {
        user: LYRA,
        reason: "Aldis (1400000000000000001) : insultes répétées",
      },
      { user: corvus, reason: "spam" },
      { user: brynja, reason: null },
    ],
  })

  expect(await readRecord(discord, LYRA.id)).toEqual({
    id: LYRA.id,
    name: "Lyra",
    nick: null,
    globalName: "Lyra",
    username: "lyra_gates",
    avatarUrl: null,
    createdAt: LYRA_CREATED_AT,
    standing: {
      kind: "banned",
      reason: "insultes répétées",
      staffMemberName: "Aldis",
    },
  })
  expect((await readRecord(discord, corvus.id))?.standing).toEqual({
    kind: "banned",
    reason: "spam",
    staffMemberName: null,
  })
  expect((await readRecord(discord, brynja.id))?.standing).toEqual({
    kind: "banned",
    reason: null,
    staffMemberName: null,
  })
})

test("an account that is neither a member nor banned is absent from the Discord server, and shows its Discord avatar", async () => {
  const discord = new FakeDiscord({
    users: [{ ...LYRA, avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9" }],
  })

  expect(await readRecord(discord, LYRA.id)).toEqual({
    id: LYRA.id,
    name: "Lyra",
    nick: null,
    globalName: "Lyra",
    username: "lyra_gates",
    avatarUrl:
      "https://cdn.discordapp.com/avatars/175928847299117063/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
    createdAt: LYRA_CREATED_AT,
    standing: { kind: "absent" },
  })
})

test("an ID that names no account has no record", async () => {
  expect(await readRecord(new FakeDiscord(), "1400000000000000009")).toBeNull()
})

test("a parameter that is no ID has no record, and asks Discord nothing", async () => {
  const discord = new FakeDiscord({ users: [LYRA] })
  for (const method of ["getMember", "getBan", "getUser"] as const) {
    discord.failNext(
      method,
      new DiscordError({ method: "GET", route: ROUTES.user, status: 400 })
    )
  }

  expect(await readRecord(discord, "lyra_gates")).toBeNull()
  expect(await readRecord(discord, "99999999999999999999")).toBeNull()
  expect(await readRecord(discord, [LYRA.id])).toBeNull()
  expect(await readRecord(discord, undefined)).toBeNull()
})

test("a member's record shows their avatar on the Discord server, else their Discord avatar", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: { ...LYRA, avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9" },
        avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
      },
      {
        user: {
          id: "1400000000000000002",
          username: "brynja",
          avatar: "6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c",
        },
      },
    ],
  })

  expect((await readRecord(discord, LYRA.id))?.avatarUrl).toBe(
    "https://cdn.discordapp.com/guilds/1100000000000000000/users/175928847299117063/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64"
  )
  expect((await readRecord(discord, "1400000000000000002"))?.avatarUrl).toBe(
    "https://cdn.discordapp.com/avatars/1400000000000000002/6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c.webp?size=64"
  )
})
