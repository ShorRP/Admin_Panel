import {
  AuditLogEvent,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { banAccount } from "./ban-account"

const STAFF = { id: "1300000000000000000", name: "Staff", position: 7 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 6,
}

const BANS = { id: "1300000000000000003", name: "Bannissements", position: 5 }

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 3 }

const ADMIN = {
  id: "1300000000000000022",
  name: "Intendant",
  position: 2,
  permissions: PermissionFlagsBits.Administrator.toString(),
}

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra",
  global_name: "Lyra",
}

const EIRA = { id: "1400000000000000004", username: "eira" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const ESKIL = { id: "1400000000000000006", username: "eskil" }

const OUTSIDER = { id: "1400000000000000008", username: "outsider" }

const DIRECT_MESSAGE = `Tu as reçu un bannissement du serveur Discord de Shor.

Motif : Insultes répétées

La marche à suivre pour le contester n’est pas encore fixée.

Ne réponds pas à ce message : personne ne le lit.

Le staff de Shor`

function discordWith() {
  return new FakeDiscord({
    roles: [STAFF, MODERATION, BANS, PANEL, ADMIN, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id, BANS.id] },
      { user: BRYNJA, roles: [STAFF.id] },
      { user: LYRA, roles: [GUARD.id] },
      { user: EIRA, roles: [STAFF.id, MODERATION.id] },
      { user: HALDOR, roles: [ADMIN.id] },
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

function banForm({
  userId = LYRA.id,
  reason = "Insultes répétées",
  deleteMessages = "3600",
  notify = true,
} = {}) {
  const data = new FormData()
  data.set("change", "ban")
  data.set("userId", userId)
  data.set("reason", reason)
  data.set("deleteMessages", deleteMessages)
  if (notify) {
    data.set("notify", "on")
  }
  return data
}

async function bans(discord: FakeDiscord) {
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.MemberBanAdd,
  })
  return audit_log_entries.map(({ target_id, reason }) => ({
    target_id,
    reason,
  }))
}

test("a staff member who bans bans a member, deleting the messages they chose, with their reason in the audit log and the ban, once the member has received the direct message", async () => {
  const discord = discordWith()

  const result = await banAccount(
    discord,
    await staffMemberOn(discord),
    banForm()
  )

  expect(result).toEqual({
    ok: true,
    message: "Le bannissement de Lyra a eu lieu. Le message privé est parti.",
  })
  expect(await discord.getMember(LYRA.id)).toBeNull()
  expect(await discord.getBan(LYRA.id)).toMatchObject({
    reason: "aldis (1400000000000000001) : Insultes répétées",
  })
  expect(await bans(discord)).toEqual([
    {
      target_id: LYRA.id,
      reason: "aldis (1400000000000000001) : Insultes répétées",
    },
  ])
  expect(discord.deletedMessageSecondsOf(LYRA.id)).toBe(3600)
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test("each choice of messages to delete reaches Discord, from none to 7 days", async () => {
  for (const seconds of [0, 3600, 21600, 43200, 86400, 259200, 604800]) {
    const discord = discordWith()

    await banAccount(
      discord,
      await staffMemberOn(discord),
      banForm({ deleteMessages: String(seconds), notify: false })
    )

    expect(discord.deletedMessageSecondsOf(LYRA.id)).toBe(seconds)
  }
})

test("without the direct message, the member is banned and receives none", async () => {
  const discord = discordWith()

  const result = await banAccount(
    discord,
    await staffMemberOn(discord),
    banForm({ notify: false })
  )

  expect(result).toEqual({
    ok: true,
    message: "Le bannissement de Lyra a eu lieu.",
  })
  expect(await discord.getBan(LYRA.id)).not.toBeNull()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
})

test("an account absent from the Discord server is banned by its ID, with no direct message to offer", async () => {
  const discord = discordWith()

  const result = await banAccount(
    discord,
    await staffMemberOn(discord),
    banForm({ userId: OUTSIDER.id, notify: false })
  )

  expect(result).toEqual({
    ok: true,
    message: "Le bannissement de outsider a eu lieu.",
  })
  expect(await bans(discord)).toEqual([
    {
      target_id: OUTSIDER.id,
      reason: "aldis (1400000000000000001) : Insultes répétées",
    },
  ])
  expect(discord.directMessagesTo(OUTSIDER.id)).toEqual([])
})

test("a direct message asked for an account that is no longer a member, as when it leaves once its record shows, is refused by Discord, which the result says, and the ban lands all the same", async () => {
  const discord = discordWith()

  expect(
    await banAccount(
      discord,
      await staffMemberOn(discord),
      banForm({ userId: OUTSIDER.id })
    )
  ).toEqual({
    ok: true,
    message:
      "Le bannissement de outsider a eu lieu. outsider n’a pas reçu le message privé : Discord l’a refusé.",
  })
  expect(await discord.getBan(OUTSIDER.id)).not.toBeNull()
})

test("a reason is required, of 400 characters at most, the messages to delete are one of the choices, and a refused form keeps what was typed", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  expect(
    await banAccount(discord, staffMember, banForm({ reason: "  " }))
  ).toEqual({
    ok: false,
    message: "Saisis un motif.",
    change: "ban",
    reason: "  ",
    deleteMessages: "3600",
    notify: true,
  })
  expect(
    await banAccount(
      discord,
      staffMember,
      banForm({
        reason: "é".repeat(401),
        deleteMessages: "604801",
        notify: false,
      })
    )
  ).toEqual({
    ok: false,
    message:
      "Raccourcis ce motif : le panel n’en accepte pas plus de 400 caractères. Choisis les messages à supprimer.",
    change: "ban",
    reason: "é".repeat(401),
    deleteMessages: "604801",
    notify: false,
  })
  expect(await discord.getBan(LYRA.id)).toBeNull()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
  expect(
    await banAccount(
      discord,
      staffMember,
      banForm({ reason: "😀".repeat(400), notify: false })
    )
  ).toMatchObject({ ok: true })
})

test("a ban the hierarchy refuses is refused before Discord is called, and sends no direct message", async () => {
  const discord = discordWith()

  expect(
    await banAccount(
      discord,
      await staffMemberOn(discord),
      banForm({ userId: BRYNJA.id })
    )
  ).toEqual({
    ok: false,
    message:
      "Tu ne peux pas sanctionner ce membre : son rôle le plus haut égale ou dépasse le tien.",
    change: "ban",
    reason: "Insultes répétées",
    deleteMessages: "3600",
    notify: true,
  })
  expect(await discord.getMember(BRYNJA.id)).not.toBeNull()
  expect(discord.directMessagesTo(BRYNJA.id)).toEqual([])
  expect(await bans(discord)).toEqual([])
})

test("a member with the Administrator permission, below the staff member and the application, can be banned", async () => {
  const discord = discordWith()

  expect(
    await banAccount(
      discord,
      await staffMemberOn(discord),
      banForm({ userId: HALDOR.id, notify: false })
    )
  ).toEqual({ ok: true, message: "Le bannissement de haldor a eu lieu." })
  expect(await discord.getBan(HALDOR.id)).not.toBeNull()
})

test("an account already banned is not banned again, and an ID that names no account cannot be banned", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  expect(
    await banAccount(discord, staffMember, banForm({ userId: ESKIL.id }))
  ).toMatchObject({ ok: false, message: "Ce compte est déjà banni." })
  for (const userId of ["1400000000000000009", "not-an-id"]) {
    expect(
      await banAccount(discord, staffMember, banForm({ userId }))
    ).toMatchObject({
      ok: false,
      message: "Aucun compte Discord n’a cet ID.",
    })
  }
  expect(await bans(discord)).toEqual([])
})

test("Discord unavailable during the ban, once the direct message has gone, says the ban may or may not have landed, says the message went, and keeps the form", async () => {
  const discord = discordWith()
  discord.failNext(
    "createBan",
    new DiscordError({ method: "PUT", route: ROUTES.guildBan, status: 503 })
  )

  expect(
    await banAccount(discord, await staffMemberOn(discord), banForm())
  ).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : le bannissement a peut-être eu lieu, peut-être pas. Recharge la page pour vérifier, puis réessaie. Le message privé est parti : décoche « Prévenir en message privé » avant de réessayer.",
    change: "ban",
    reason: "Insultes répétées",
    deleteMessages: "3600",
    notify: true,
  })
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test("Discord unavailable before the ban says it did not happen, and sends no direct message", async () => {
  const discord = discordWith()
  discord.failNext(
    "getBan",
    new DiscordError({ method: "GET", route: ROUTES.guildBan })
  )

  expect(
    await banAccount(
      discord,
      await staffMemberOn(discord),
      banForm({ userId: OUTSIDER.id })
    )
  ).toMatchObject({
    ok: false,
    message:
      "Discord n’a pas répondu : le bannissement n’a pas eu lieu. Réessaie.",
  })
  expect(await bans(discord)).toEqual([])
})

test("a panel error during the ban is thrown, though the direct message has gone", async () => {
  const discord = discordWith()
  const missingPermissions = new DiscordError({
    method: "PUT",
    route: ROUTES.guildBan,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
  })
  discord.failNext("createBan", missingPermissions)

  await expect(
    banAccount(discord, await staffMemberOn(discord), banForm())
  ).rejects.toBe(missingPermissions)
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test("a staff member who moderates without a role of the bans' list cannot ban", async () => {
  const discord = discordWith()

  await expect(
    banAccount(
      discord,
      await staffMemberOn(discord, EIRA.id),
      banForm({ notify: false })
    )
  ).rejects.toThrow()
  expect(await discord.getBan(LYRA.id)).toBeNull()
})
