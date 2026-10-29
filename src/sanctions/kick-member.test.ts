import {
  AuditLogEvent,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeMember } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { kickMember } from "./kick-member"

const STAFF = { id: "1300000000000000000", name: "Staff", position: 6 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 5,
}

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

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const OUTSIDER = { id: "1400000000000000008", username: "outsider" }

const DIRECT_MESSAGE = `Tu as reçu une expulsion du serveur Discord de Shor.

Motif : Insultes répétées

Pour la contester, rejoins le serveur Discord par une invitation, puis ouvre un ticket de support « ❓ Autre demande ».

Ne réponds pas à ce message : personne ne le lit.

Le staff de Shor`

function discordWith(lyra: Partial<FakeMember> = {}) {
  return new FakeDiscord({
    roles: [STAFF, MODERATION, PANEL, ADMIN, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
      { user: BRYNJA, roles: [STAFF.id] },
      { user: LYRA, roles: [GUARD.id], ...lyra },
      { user: HALDOR, roles: [ADMIN.id] },
    ],
    users: [OUTSIDER],
  })
}

async function staffMemberOn(discord: FakeDiscord, userId = ALDIS.id) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF.id,
      moderationRoleIds: [MODERATION.id],
      banRoleIds: [],
    },
    userId
  )
  if (staffMember === null) {
    throw new Error(`${userId} is no staff member`)
  }
  return staffMember
}

function kickForm({
  userId = LYRA.id,
  reason = "Insultes répétées",
  notify = true,
} = {}) {
  const data = new FormData()
  data.set("change", "kick")
  data.set("userId", userId)
  data.set("reason", reason)
  if (notify) {
    data.set("notify", "on")
  }
  return data
}

async function kicks(discord: FakeDiscord) {
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.MemberKick,
  })
  return audit_log_entries.map(({ target_id, reason }) => ({
    target_id,
    reason,
  }))
}

test("a moderator kicks a member, with their reason in the audit log, once the member has received the direct message", async () => {
  const discord = discordWith()

  const result = await kickMember(
    discord,
    await staffMemberOn(discord),
    kickForm()
  )

  expect(result).toEqual({
    ok: true,
    message: "L’expulsion de Lyra a eu lieu. Le message privé est parti.",
  })
  expect(await discord.getMember(LYRA.id)).toBeNull()
  expect(await kicks(discord)).toEqual([
    {
      target_id: LYRA.id,
      reason: "aldis (1400000000000000001) : Insultes répétées",
    },
  ])
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test("without the direct message, the member is kicked and receives none", async () => {
  const discord = discordWith()

  const result = await kickMember(
    discord,
    await staffMemberOn(discord),
    kickForm({ notify: false })
  )

  expect(result).toEqual({
    ok: true,
    message: "L’expulsion de Lyra a eu lieu.",
  })
  expect(await discord.getMember(LYRA.id)).toBeNull()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
})

test("a member who refuses direct messages is kicked all the same, and the result says they did not receive it", async () => {
  const discord = discordWith({ allowsDirectMessages: false })

  const result = await kickMember(
    discord,
    await staffMemberOn(discord),
    kickForm()
  )

  expect(result).toEqual({
    ok: true,
    message:
      "L’expulsion de Lyra a eu lieu. Lyra n’a pas reçu le message privé : Discord l’a refusé.",
  })
  expect(await discord.getMember(LYRA.id)).toBeNull()
})

test("when Discord does not answer for the direct message, the member is kicked all the same, and the result says they may not have received it", async () => {
  const discord = discordWith()
  discord.failNext(
    "createDm",
    new DiscordError({ method: "POST", route: ROUTES.currentUserChannels })
  )

  const result = await kickMember(
    discord,
    await staffMemberOn(discord),
    kickForm()
  )

  expect(result).toEqual({
    ok: true,
    message:
      "L’expulsion de Lyra a eu lieu. Lyra n’a peut-être pas reçu le message privé : Discord n’a pas répondu.",
  })
  expect(await discord.getMember(LYRA.id)).toBeNull()
})

test("a reason is required, of 400 characters at most, an emoji counting as one, and a refused form keeps what was typed", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  expect(
    await kickMember(discord, staffMember, kickForm({ reason: "  " }))
  ).toEqual({
    ok: false,
    message: "Saisis un motif.",
    change: "kick",
    reason: "  ",
    notify: true,
  })
  expect(
    await kickMember(
      discord,
      staffMember,
      kickForm({ reason: "é".repeat(401), notify: false })
    )
  ).toEqual({
    ok: false,
    message:
      "Raccourcis ce motif : le panel n’en accepte pas plus de 400 caractères.",
    change: "kick",
    reason: "é".repeat(401),
    notify: false,
  })
  expect(await discord.getMember(LYRA.id)).not.toBeNull()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
  expect(
    await kickMember(
      discord,
      staffMember,
      kickForm({ reason: "😀".repeat(400), notify: false })
    )
  ).toMatchObject({ ok: true })
})

test("a kick the hierarchy refuses is refused before Discord is called, and sends no direct message", async () => {
  const discord = discordWith()

  expect(
    await kickMember(
      discord,
      await staffMemberOn(discord),
      kickForm({ userId: BRYNJA.id })
    )
  ).toEqual({
    ok: false,
    message:
      "Tu ne peux pas sanctionner ce membre : son rôle le plus haut égale ou dépasse le tien.",
    change: "kick",
    reason: "Insultes répétées",
    notify: true,
  })
  expect(await discord.getMember(BRYNJA.id)).not.toBeNull()
  expect(discord.directMessagesTo(BRYNJA.id)).toEqual([])
  expect(await kicks(discord)).toEqual([])
})

test("a member with the Administrator permission, below the staff member and the application, can be kicked", async () => {
  const discord = discordWith()

  expect(
    await kickMember(
      discord,
      await staffMemberOn(discord),
      kickForm({ userId: HALDOR.id, notify: false })
    )
  ).toEqual({ ok: true, message: "L’expulsion de haldor a eu lieu." })
  expect(await discord.getMember(HALDOR.id)).toBeNull()
})

test("an account that is not a member, or an ID that names none, cannot be kicked", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  for (const userId of [OUTSIDER.id, "not-an-id"]) {
    expect(
      await kickMember(discord, staffMember, kickForm({ userId }))
    ).toMatchObject({
      ok: false,
      message: "Ce compte n’est pas membre du serveur Discord.",
    })
  }
  expect(discord.directMessagesTo(OUTSIDER.id)).toEqual([])
  expect(await kicks(discord)).toEqual([])
})

test("Discord unavailable during the kick, once the direct message has gone, says the kick may or may not have landed, says the message went, and keeps the form", async () => {
  const discord = discordWith()
  discord.failNext(
    "removeMember",
    new DiscordError({
      method: "DELETE",
      route: ROUTES.guildMember,
      status: 503,
    })
  )

  const result = await kickMember(
    discord,
    await staffMemberOn(discord),
    kickForm()
  )

  expect(result).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : l’expulsion a peut-être eu lieu, peut-être pas. Recharge la page pour vérifier, puis réessaie. Le message privé est parti : décoche « Prévenir en message privé » avant de réessayer.",
    change: "kick",
    reason: "Insultes répétées",
    notify: true,
  })
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test("Discord unavailable during the kick, for a member who refuses direct messages, says the kick may or may not have landed, and that the member did not receive the message", async () => {
  const discord = discordWith({ allowsDirectMessages: false })
  discord.failNext(
    "removeMember",
    new DiscordError({
      method: "DELETE",
      route: ROUTES.guildMember,
      status: 503,
    })
  )

  expect(
    await kickMember(discord, await staffMemberOn(discord), kickForm())
  ).toMatchObject({
    ok: false,
    message:
      "Discord n’a pas répondu : l’expulsion a peut-être eu lieu, peut-être pas. Recharge la page pour vérifier, puis réessaie. Lyra n’a pas reçu le message privé : Discord l’a refusé.",
  })
})

test("Discord unavailable before the kick says it did not happen, and sends no direct message", async () => {
  const discord = discordWith()
  discord.failNext(
    "getGuild",
    new DiscordError({ method: "GET", route: ROUTES.guild })
  )

  expect(
    await kickMember(discord, await staffMemberOn(discord), kickForm())
  ).toEqual({
    ok: false,
    message: "Discord n’a pas répondu : l’expulsion n’a pas eu lieu. Réessaie.",
    change: "kick",
    reason: "Insultes répétées",
    notify: true,
  })
  expect(await discord.getMember(LYRA.id)).not.toBeNull()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
})

test("a panel error during the kick is thrown, though the direct message has gone", async () => {
  const discord = discordWith()
  const missingPermissions = new DiscordError({
    method: "DELETE",
    route: ROUTES.guildMember,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
  })
  discord.failNext("removeMember", missingPermissions)

  await expect(
    kickMember(discord, await staffMemberOn(discord), kickForm())
  ).rejects.toBe(missingPermissions)
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test("a panel error during the direct message is thrown, once the member is kicked all the same", async () => {
  const discord = discordWith()
  const invalidMessage = new DiscordError({
    method: "POST",
    route: ROUTES.channelMessages,
    status: 400,
    code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
  })
  discord.failNext("createMessage", invalidMessage)

  await expect(
    kickMember(discord, await staffMemberOn(discord), kickForm())
  ).rejects.toBe(invalidMessage)
  expect(await discord.getMember(LYRA.id)).toBeNull()
})

test("a staff member who does not moderate cannot kick", async () => {
  const discord = discordWith()

  await expect(
    kickMember(
      discord,
      await staffMemberOn(discord, BRYNJA.id),
      kickForm({ notify: false })
    )
  ).rejects.toThrow()
  expect(await discord.getMember(LYRA.id)).not.toBeNull()
})
