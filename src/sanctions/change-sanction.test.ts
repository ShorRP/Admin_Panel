import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember } from "@/staff/staff-member"
import { changeSanction } from "./change-sanction"

const STAFF = { id: "1300000000000000000", name: "Staff", position: 3 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 2,
}

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 1 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = { id: "1400000000000000003", username: "lyra" }

async function moderatorAndDiscord() {
  const discord = new FakeDiscord({
    roles: [STAFF, MODERATION, PANEL],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
      { user: LYRA },
    ],
  })
  const staffMember = await findStaffMember(
    discord,
    { staffRoleId: STAFF.id, moderationRoleIds: [MODERATION.id] },
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
