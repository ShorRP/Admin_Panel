import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember } from "@/staff/staff-member"
import { changeSanction } from "./change-sanction"

const STAFF = { id: "1300000000000000000", name: "Staff", position: 4 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 3,
}

const BANS = { id: "1300000000000000003", name: "Bannissements", position: 2 }

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 1 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = { id: "1400000000000000003", username: "lyra" }

const ESKIL = { id: "1400000000000000006", username: "eskil" }

async function moderatorAndDiscord() {
  const discord = new FakeDiscord({
    roles: [STAFF, MODERATION, BANS, PANEL],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id, BANS.id] },
      { user: LYRA },
    ],
    bans: [{ user: ESKIL }],
  })
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
  return { discord, staffMember }
}

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value)
  }
  return data
}

test("a form that kicks kicks the member", async () => {
  const { discord, staffMember } = await moderatorAndDiscord()

  const result = await changeSanction(
    discord,
    staffMember,
    form({ change: "kick", userId: LYRA.id, reason: "Spam" })
  )

  expect(result).toMatchObject({ ok: true })
  expect(await discord.getMember(LYRA.id)).toBeNull()
})

test("a form that bans bans the account", async () => {
  const { discord, staffMember } = await moderatorAndDiscord()

  const result = await changeSanction(
    discord,
    staffMember,
    form({
      change: "ban",
      userId: LYRA.id,
      deleteMessages: "0",
      reason: "Spam",
    })
  )

  expect(result).toMatchObject({ ok: true })
  expect(await discord.getBan(LYRA.id)).not.toBeNull()
})

test("a form that lifts a ban lifts it", async () => {
  const { discord, staffMember } = await moderatorAndDiscord()

  const result = await changeSanction(
    discord,
    staffMember,
    form({ change: "lift-ban", userId: ESKIL.id, reason: "Erreur" })
  )

  expect(result).toMatchObject({ ok: true })
  expect(await discord.getBan(ESKIL.id)).toBeNull()
})

test("a form that times out times the member out", async () => {
  const { discord, staffMember } = await moderatorAndDiscord()

  const result = await changeSanction(
    discord,
    staffMember,
    form({
      change: "time-out",
      userId: LYRA.id,
      duration: "60",
      reason: "Spam",
    })
  )

  expect(result).toMatchObject({ ok: true })
  expect(
    (await discord.getMember(LYRA.id))?.communication_disabled_until
  ).not.toBeNull()
})
