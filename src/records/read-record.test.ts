import { expect, test } from "vitest"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeUser } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { banAccount } from "@/sanctions/ban-account"
import { findStaffMember } from "@/staff/staff-member"
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

const STAFF = { id: "1300000000000000000", name: "Staff", position: 7 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 6,
}

const BANS = { id: "1300000000000000003", name: "Bannissements", position: 5 }

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 3 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const MODERATORS = {
  roles: [STAFF, MODERATION, BANS, PANEL, GUARD],
  applicationRoles: [PANEL.id],
  members: [
    { user: ALDIS, roles: [STAFF.id, MODERATION.id, BANS.id] },
    { user: BRYNJA, roles: [STAFF.id, MODERATION.id] },
  ],
}

function discordWithLyra(users: FakeUser[] = []) {
  return new FakeDiscord({
    ...MODERATORS,
    members: [...MODERATORS.members, { user: LYRA, roles: [GUARD.id] }],
    users,
  })
}

async function aldisOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF.id,
      moderationRoleIds: [MODERATION.id],
      banRoleIds: [BANS.id],
    },
    ALDIS.id
  )
  if (staffMember === null) {
    throw new Error("Aldis is no staff member")
  }
  return staffMember
}

function banForm(reason: string) {
  const data = new FormData()
  data.set("change", "ban")
  data.set("userId", LYRA.id)
  data.set("reason", reason)
  data.set("deleteMessages", "0")
  return data
}

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

test("a ban given through the panel shows its reason without the panel’s prefix, and the staff member who gave it", async () => {
  const discord = discordWithLyra()
  await banAccount(
    discord,
    await aldisOn(discord),
    banForm("insultes répétées")
  )

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
      staffMemberName: "aldis",
    },
  })
})

test("a ban given by hand in Discord shows its whole reason and no staff member, though the reason follows the panel’s format", async () => {
  const discord = discordWithLyra()
  const reason = auditLogReason(await aldisOn(discord), "insultes répétées")
  discord.createBanAs(BRYNJA.id, LYRA.id, reason)

  expect((await readRecord(discord, LYRA.id))?.standing).toEqual({
    kind: "banned",
    reason,
    staffMemberName: null,
  })
})

test("a ban shows the reason Discord keeps whole when it follows no format, and none when it has none", async () => {
  const corvus = { id: "1400000000000000003", username: "corvus" }
  const discord = new FakeDiscord({
    bans: [
      { user: LYRA, reason: "spam" },
      { user: corvus, reason: null },
    ],
  })

  expect((await readRecord(discord, LYRA.id))?.standing).toEqual({
    kind: "banned",
    reason: "spam",
    staffMemberName: null,
  })
  expect((await readRecord(discord, corvus.id))?.standing).toEqual({
    kind: "banned",
    reason: null,
    staffMemberName: null,
  })
})

test("a ban whose entry has left the audit log shows as given in Discord, whole reason and no staff member, though the reason follows the panel’s format", async () => {
  const reason = auditLogReason(
    await aldisOn(discordWithLyra()),
    "insultes répétées"
  )
  const discord = new FakeDiscord({ bans: [{ user: LYRA, reason }] })

  expect((await readRecord(discord, LYRA.id))?.standing).toEqual({
    kind: "banned",
    reason,
    staffMemberName: null,
  })
})

test("a ban given again by hand after the panel’s was lifted shows as given in Discord", async () => {
  const discord = discordWithLyra()
  await banAccount(
    discord,
    await aldisOn(discord),
    banForm("insultes répétées")
  )
  discord.removeBanAs(BRYNJA.id, LYRA.id)
  discord.createBanAs(BRYNJA.id, LYRA.id, "spam")

  expect((await readRecord(discord, LYRA.id))?.standing).toEqual({
    kind: "banned",
    reason: "spam",
    staffMemberName: null,
  })
})

test("a ban given through the panel is found among the entries past the first 100 bans the audit log holds", async () => {
  const strangers = Array.from({ length: 100 }, (_, index) => ({
    id: (BigInt("1600000000000000000") + BigInt(index)).toString(),
    username: `stranger${index}`,
  }))
  const discord = discordWithLyra(strangers)
  await banAccount(
    discord,
    await aldisOn(discord),
    banForm("insultes répétées")
  )
  for (const stranger of strangers) {
    discord.createBanAs(BRYNJA.id, stranger.id, "spam")
  }

  expect((await readRecord(discord, LYRA.id))?.standing).toEqual({
    kind: "banned",
    reason: "insultes répétées",
    staffMemberName: "aldis",
  })
})

test("a failed read of the audit log is thrown rather than leaving a ban read as given in Discord", async () => {
  const discord = new FakeDiscord({ bans: [{ user: LYRA }] })
  const unavailable = new DiscordError({
    method: "GET",
    route: ROUTES.guildAuditLog,
    status: 503,
  })
  discord.failNext("getAuditLog", unavailable)

  await expect(readRecord(discord, LYRA.id)).rejects.toBe(unavailable)
})

test("a failed read of the panel’s application is thrown rather than leaving a ban of the panel read as given in Discord", async () => {
  const discord = discordWithLyra()
  await banAccount(
    discord,
    await aldisOn(discord),
    banForm("insultes répétées")
  )
  const unavailable = new DiscordError({
    method: "GET",
    route: ROUTES.currentUser,
    status: 503,
  })
  discord.failNext("getApplicationUser", unavailable)

  await expect(readRecord(discord, LYRA.id)).rejects.toBe(unavailable)
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
