import { AuditLogEvent } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { liftBan } from "./lift-ban"

const STAFF = { id: "1300000000000000000", name: "Staff", position: 4 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 3,
}

const BANS = { id: "1300000000000000003", name: "Bannissements", position: 2 }

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 1 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const EIRA = { id: "1400000000000000004", username: "eira" }

const ESKIL = {
  id: "1400000000000000006",
  username: "eskil",
  global_name: "Eskil",
}

const OUTSIDER = { id: "1400000000000000008", username: "outsider" }

function discordWith() {
  return new FakeDiscord({
    roles: [STAFF, MODERATION, BANS, PANEL],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id, BANS.id] },
      { user: EIRA, roles: [STAFF.id, MODERATION.id] },
    ],
    users: [OUTSIDER],
    bans: [{ user: ESKIL, reason: "Spam" }],
  })
}

async function staffMemberOn(discord: FakeDiscord, userId = ALDIS.id) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF.id,
      moderationRoleIds: [MODERATION.id],
      banRoleIds: [BANS.id],
    },
    userId
  )
  if (staffMember === null) {
    throw new Error(`${userId} is no staff member`)
  }
  return staffMember
}

function liftForm({ userId = ESKIL.id, reason = "Erreur de cible" } = {}) {
  const data = new FormData()
  data.set("change", "lift-ban")
  data.set("userId", userId)
  data.set("reason", reason)
  return data
}

async function lifts(discord: FakeDiscord) {
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.MemberBanRemove,
  })
  return audit_log_entries.map(({ target_id, reason }) => ({
    target_id,
    reason,
  }))
}

test("a staff member who bans lifts a ban, with their reason in the audit log, and the account stays off the Discord server", async () => {
  const discord = discordWith()

  const result = await liftBan(
    discord,
    await staffMemberOn(discord),
    liftForm()
  )

  expect(result).toEqual({
    ok: true,
    message: "Le bannissement de Eskil est levé.",
  })
  expect(await discord.getBan(ESKIL.id)).toBeNull()
  expect(await discord.getMember(ESKIL.id)).toBeNull()
  expect(await discord.getUser(ESKIL.id)).toMatchObject({ id: ESKIL.id })
  expect(await lifts(discord)).toEqual([
    {
      target_id: ESKIL.id,
      reason: "aldis (1400000000000000001) : Erreur de cible",
    },
  ])
  expect(discord.directMessagesTo(ESKIL.id)).toEqual([])
})

test("a reason is required, of 400 characters at most, and a refused form keeps what was typed", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  expect(
    await liftBan(discord, staffMember, liftForm({ reason: "  " }))
  ).toEqual({
    ok: false,
    message: "Saisis un motif.",
    change: "lift-ban",
    reason: "  ",
  })
  expect(
    await liftBan(discord, staffMember, liftForm({ reason: "é".repeat(401) }))
  ).toMatchObject({
    ok: false,
    message:
      "Raccourcis ce motif : le panel n’en accepte pas plus de 400 caractères.",
  })
  expect(await discord.getBan(ESKIL.id)).not.toBeNull()
})

test("an account that is not banned, or an ID that names none, has no ban to lift", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  for (const userId of [OUTSIDER.id, "not-an-id"]) {
    expect(await liftBan(discord, staffMember, liftForm({ userId }))).toEqual({
      ok: false,
      message: "Ce compte n’est pas banni.",
      change: "lift-ban",
      reason: "Erreur de cible",
    })
  }
  expect(await lifts(discord)).toEqual([])
})

test("Discord unavailable before the lift says it did not happen, and keeps the form", async () => {
  const discord = discordWith()
  discord.failNext(
    "getBan",
    new DiscordError({ method: "GET", route: ROUTES.guildBan })
  )

  expect(
    await liftBan(discord, await staffMemberOn(discord), liftForm())
  ).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : la levée du bannissement n’a pas eu lieu. Réessaie.",
    change: "lift-ban",
    reason: "Erreur de cible",
  })
  expect(await discord.getBan(ESKIL.id)).not.toBeNull()
})

test("Discord unavailable during the lift says it may or may not have landed, and keeps the form", async () => {
  const discord = discordWith()
  discord.failNext(
    "removeBan",
    new DiscordError({ method: "DELETE", route: ROUTES.guildBan, status: 503 })
  )

  expect(
    await liftBan(discord, await staffMemberOn(discord), liftForm())
  ).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : la levée du bannissement est peut-être passée, peut-être pas. Recharge la page pour vérifier, puis réessaie.",
    change: "lift-ban",
    reason: "Erreur de cible",
  })
})

test("a staff member who moderates without a role of the bans' list cannot lift a ban", async () => {
  const discord = discordWith()

  await expect(
    liftBan(discord, await staffMemberOn(discord, EIRA.id), liftForm())
  ).rejects.toThrow()
  expect(await discord.getBan(ESKIL.id)).not.toBeNull()
})
