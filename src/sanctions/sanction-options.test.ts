import { PermissionFlagsBits } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { FakeDiscord, type FakeUser } from "@/discord/fake-discord"
import { readRecord } from "@/records/read-record"
import { findStaffMember } from "@/staff/staff-member"
import { readSanctionOptions } from "./sanction-options"

const STAFF = { id: "1300000000000000000", name: "Staff", position: 6 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 5,
}

const BANS = { id: "1300000000000000003", name: "Bannissements", position: 5 }

const SENIOR = { id: "1300000000000000020", name: "Ancien", position: 4 }

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 3 }

const ADMIN = {
  id: "1300000000000000022",
  name: "Intendant",
  position: 2,
  permissions: PermissionFlagsBits.Administrator.toString(),
}

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = { id: "1400000000000000003", username: "lyra" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const ESKIL = { id: "1400000000000000006", username: "eskil" }

const OWNER = { id: "1400000000000000007", username: "owner" }

const OUTSIDER = { id: "1400000000000000008", username: "outsider" }

const SIGRID = { id: "1400000000000000010", username: "sigrid" }

function discordWith(timedOutUntil: string | null = null) {
  return new FakeDiscord({
    ownerId: OWNER.id,
    roles: [STAFF, MODERATION, BANS, SENIOR, PANEL, ADMIN, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
      { user: SIGRID, roles: [STAFF.id, MODERATION.id, BANS.id] },
      {
        user: LYRA,
        roles: [GUARD.id],
        communication_disabled_until: timedOutUntil,
      },
      { user: BRYNJA, roles: [STAFF.id] },
      { user: CORVUS, roles: [SENIOR.id] },
      { user: HALDOR, roles: [ADMIN.id] },
      { user: OWNER, roles: [GUARD.id] },
    ],
    users: [OUTSIDER],
    bans: [{ user: ESKIL }],
  })
}

async function optionsFor(
  discord: FakeDiscord,
  account: FakeUser,
  staffMemberId = ALDIS.id
) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF.id,
      moderationRoleIds: [MODERATION.id],
      banRoleIds: [BANS.id],
    },
    staffMemberId
  )
  if (staffMember === null) {
    throw new Error(`${staffMemberId} is no staff member`)
  }
  return await readSanctionOptions(
    discord,
    staffMember,
    await readRecord(discord, account.id)
  )
}

test("a member below the staff member and the application can be timed out or kicked, and is not timed out yet", async () => {
  expect(await optionsFor(discordWith(), LYRA)).toEqual({
    kind: "member",
    userId: LYRA.id,
    timeout: { kind: "open", timedOutUntil: null },
    ban: false,
  })
})

test("a staff member who bans can also ban a member", async () => {
  expect(await optionsFor(discordWith(), LYRA, SIGRID.id)).toEqual({
    kind: "member",
    userId: LYRA.id,
    timeout: { kind: "open", timedOutUntil: null },
    ban: true,
  })
})

test("a timed-out member can be timed out again or lifted, until the end of their timeout", async () => {
  expect(
    await optionsFor(discordWith("2099-11-02T18:30:00.000Z"), LYRA)
  ).toEqual({
    kind: "member",
    userId: LYRA.id,
    timeout: {
      kind: "open",
      timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
    },
    ban: false,
  })
})

test("a staff member cannot sanction themselves", async () => {
  expect(await optionsFor(discordWith(), ALDIS)).toEqual({
    kind: "refused",
    reason: "C’est ta propre fiche : tu ne peux pas te sanctionner toi-même.",
  })
})

test("nobody sanctions the owner of the Discord server, whatever their roles", async () => {
  expect(await optionsFor(discordWith(), OWNER)).toEqual({
    kind: "refused",
    reason:
      "Tu ne peux pas sanctionner ce membre : c’est le propriétaire du serveur Discord.",
  })
})

test("a staff member cannot sanction a member whose highest role equals or exceeds theirs", async () => {
  expect(await optionsFor(discordWith(), BRYNJA)).toEqual({
    kind: "refused",
    reason:
      "Tu ne peux pas sanctionner ce membre : son rôle le plus haut égale ou dépasse le tien.",
  })
})

test("the panel cannot sanction a member whose highest role equals or exceeds the application's", async () => {
  expect(await optionsFor(discordWith(), CORVUS)).toEqual({
    kind: "refused",
    reason:
      "Le panel ne peut pas sanctionner ce membre : son rôle le plus haut égale ou dépasse celui de l’application du panel.",
  })
})

test("a member with the Administrator permission can be kicked, but not timed out, which the record says once", async () => {
  expect(await optionsFor(discordWith(), HALDOR)).toEqual({
    kind: "member",
    userId: HALDOR.id,
    timeout: {
      kind: "refused",
      reason:
        "Ce membre a la permission Administrateur : Discord ne l’exclut jamais temporairement.",
    },
    ban: false,
  })
})

test("for a staff member who does not ban, an account that is not a member, banned, absent or unknown, has no sanction to offer", async () => {
  const discord = discordWith()

  expect(await optionsFor(discord, ESKIL)).toEqual({ kind: "none" })
  expect(await optionsFor(discord, OUTSIDER)).toEqual({ kind: "none" })
  expect(
    await optionsFor(discord, { id: "1400000000000000009", username: "x" })
  ).toEqual({ kind: "none" })
})

test("a staff member who bans can ban an account absent from the Discord server, and lift a banned account's ban, but has nothing to offer for an ID that names no account", async () => {
  const discord = discordWith()

  expect(await optionsFor(discord, OUTSIDER, SIGRID.id)).toEqual({
    kind: "absent",
    userId: OUTSIDER.id,
  })
  expect(await optionsFor(discord, ESKIL, SIGRID.id)).toEqual({
    kind: "banned",
    userId: ESKIL.id,
  })
  expect(
    await optionsFor(
      discord,
      { id: "1400000000000000009", username: "x" },
      SIGRID.id
    )
  ).toEqual({ kind: "none" })
})
