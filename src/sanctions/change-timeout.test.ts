import {
  AuditLogEvent,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeMember } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { changeTimeout } from "./change-timeout"

const NOW = new Date("2026-10-28T14:00:00.000Z")

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

const DIRECT_MESSAGE = `Tu as reçu une exclusion temporaire du serveur Discord de Shor, jusqu’au 28 oct. 2026, 16:00 (heure de Paris).

Motif : Insultes répétées

Pour la contester, ouvre un ticket de support « ❓ Autre demande » sur le serveur Discord une fois ton exclusion temporaire terminée : d’ici là, tu ne peux plus y écrire.

Ne réponds pas à ce message : personne ne le lit.

Le staff de Shor`

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

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

function timeOutForm({
  userId = LYRA.id,
  duration = "3600",
  reason = "Insultes répétées",
  notify = true,
} = {}) {
  const data = new FormData()
  data.set("change", "time-out")
  data.set("userId", userId)
  data.set("duration", duration)
  data.set("reason", reason)
  if (notify) {
    data.set("notify", "on")
  }
  return data
}

function liftForm({ userId = LYRA.id, reason = "Erreur de cible" } = {}) {
  const data = new FormData()
  data.set("change", "lift")
  data.set("userId", userId)
  data.set("reason", reason)
  return data
}

async function timeoutEndOf(discord: FakeDiscord, userId: string) {
  return (await discord.getMember(userId))?.communication_disabled_until ?? null
}

async function memberUpdateReasons(discord: FakeDiscord) {
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.MemberUpdate,
  })
  return audit_log_entries.map(({ target_id, reason }) => ({
    target_id,
    reason,
  }))
}

test("a moderator times out a member for an hour, with their reason in the audit log, and the member receives the direct message", async () => {
  const discord = discordWith()

  const result = await changeTimeout(
    discord,
    await staffMemberOn(discord),
    timeOutForm()
  )

  expect(result).toEqual({
    ok: true,
    message:
      "Lyra est en exclusion temporaire jusqu’au 28 oct. 2026, 16:00. Le message privé est parti.",
  })
  expect(await timeoutEndOf(discord, LYRA.id)).toBe("2026-10-28T15:00:00.000Z")
  expect(await memberUpdateReasons(discord)).toEqual([
    {
      target_id: LYRA.id,
      reason: "aldis (1400000000000000001) : Insultes répétées",
    },
  ])
  expect(discord.directMessagesTo(LYRA.id)).toEqual([DIRECT_MESSAGE])
})

test.each([
  ["60", "2026-10-28T14:01:00.000Z", "28 oct. 2026, 15:01"],
  ["300", "2026-10-28T14:05:00.000Z", "28 oct. 2026, 15:05"],
  ["600", "2026-10-28T14:10:00.000Z", "28 oct. 2026, 15:10"],
  ["3600", "2026-10-28T15:00:00.000Z", "28 oct. 2026, 16:00"],
  ["86400", "2026-10-29T14:00:00.000Z", "29 oct. 2026, 15:00"],
  ["604800", "2026-11-04T14:00:00.000Z", "4 nov. 2026, 15:00"],
  ["2419200", "2026-11-25T14:00:00.000Z", "25 nov. 2026, 15:00"],
])(
  "a timeout of %s seconds ends at %s, which the result gives in Paris time",
  async (duration, end, shown) => {
    const discord = discordWith()

    const result = await changeTimeout(
      discord,
      await staffMemberOn(discord),
      timeOutForm({ duration, notify: false })
    )

    expect(result).toEqual({
      ok: true,
      message: `Lyra est en exclusion temporaire jusqu’au ${shown}.`,
    })
    expect(await timeoutEndOf(discord, LYRA.id)).toBe(end)
  }
)

test("a new timeout replaces the one under way", async () => {
  const discord = discordWith({
    communication_disabled_until: "2026-11-01T10:00:00.000Z",
  })

  await changeTimeout(
    discord,
    await staffMemberOn(discord),
    timeOutForm({ duration: "600", notify: false })
  )

  expect(await timeoutEndOf(discord, LYRA.id)).toBe("2026-10-28T14:10:00.000Z")
})

test("without the direct message, the member is timed out and receives none", async () => {
  const discord = discordWith()

  const result = await changeTimeout(
    discord,
    await staffMemberOn(discord),
    timeOutForm({ notify: false })
  )

  expect(result).toEqual({
    ok: true,
    message: "Lyra est en exclusion temporaire jusqu’au 28 oct. 2026, 16:00.",
  })
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
})

test("a member who refuses direct messages is timed out all the same, and the result says they did not receive it", async () => {
  const discord = discordWith({ allowsDirectMessages: false })

  const result = await changeTimeout(
    discord,
    await staffMemberOn(discord),
    timeOutForm()
  )

  expect(result).toEqual({
    ok: true,
    message:
      "Lyra est en exclusion temporaire jusqu’au 28 oct. 2026, 16:00. Lyra n’a pas reçu le message privé : Discord l’a refusé.",
  })
  expect(await timeoutEndOf(discord, LYRA.id)).toBe("2026-10-28T15:00:00.000Z")
})

test("when Discord does not answer for the direct message, the timeout holds, and the result says the member may not have received it", async () => {
  const discord = discordWith()
  discord.failNext(
    "createMessage",
    new DiscordError({
      method: "POST",
      route: ROUTES.channelMessages,
      status: 503,
    })
  )

  const result = await changeTimeout(
    discord,
    await staffMemberOn(discord),
    timeOutForm()
  )

  expect(result).toEqual({
    ok: true,
    message:
      "Lyra est en exclusion temporaire jusqu’au 28 oct. 2026, 16:00. Lyra n’a peut-être pas reçu le message privé : Discord n’a pas répondu.",
  })
  expect(await timeoutEndOf(discord, LYRA.id)).toBe("2026-10-28T15:00:00.000Z")
})

test("lifting a timeout clears it, with its reason in the audit log, and sends no direct message", async () => {
  const discord = discordWith({
    communication_disabled_until: "2026-11-01T10:00:00.000Z",
  })

  const result = await changeTimeout(
    discord,
    await staffMemberOn(discord),
    liftForm()
  )

  expect(result).toEqual({
    ok: true,
    message: "L’exclusion temporaire de Lyra est levée.",
  })
  expect(await timeoutEndOf(discord, LYRA.id)).toBeNull()
  expect(await memberUpdateReasons(discord)).toEqual([
    {
      target_id: LYRA.id,
      reason: "aldis (1400000000000000001) : Erreur de cible",
    },
  ])
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
})

test("a member whose timeout has ended, or who had none, has no timeout to lift", async () => {
  for (const communication_disabled_until of [
    null,
    "2026-10-28T13:59:00.000Z",
  ]) {
    const discord = discordWith({ communication_disabled_until })

    const result = await changeTimeout(
      discord,
      await staffMemberOn(discord),
      liftForm()
    )

    expect(result).toEqual({
      ok: false,
      message: "Lyra n’est pas en exclusion temporaire.",
      change: "lift",
      reason: "Erreur de cible",
    })
    expect(await memberUpdateReasons(discord)).toEqual([])
  }
})

test("a reason is required, of 400 characters at most, an accented letter or an emoji counting as one, and a refused form keeps what was typed", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  expect(
    await changeTimeout(discord, staffMember, timeOutForm({ reason: "  " }))
  ).toEqual({
    ok: false,
    message: "Saisis un motif.",
    change: "time-out",
    reason: "  ",
    duration: "3600",
    notify: true,
  })
  expect(
    await changeTimeout(
      discord,
      staffMember,
      liftForm({ reason: "é".repeat(401) })
    )
  ).toEqual({
    ok: false,
    message:
      "Raccourcis ce motif : le panel n’en accepte pas plus de 400 caractères.",
    change: "lift",
    reason: "é".repeat(401),
  })
  expect(await timeoutEndOf(discord, LYRA.id)).toBeNull()
  expect(
    await changeTimeout(
      discord,
      staffMember,
      timeOutForm({ reason: "😀".repeat(400), notify: false })
    )
  ).toMatchObject({ ok: true })
})

test("a duration is one of the seven the panel offers", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  for (const duration of ["", "120"]) {
    expect(
      await changeTimeout(
        discord,
        staffMember,
        timeOutForm({ duration, notify: false })
      )
    ).toEqual({
      ok: false,
      message: "Choisis une durée.",
      change: "time-out",
      reason: "Insultes répétées",
      duration,
      notify: false,
    })
  }
  expect(await timeoutEndOf(discord, LYRA.id)).toBeNull()
})

test("a timeout the hierarchy refuses is refused before Discord is called, timing out or lifting", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  expect(
    await changeTimeout(
      discord,
      staffMember,
      timeOutForm({ userId: BRYNJA.id, notify: false })
    )
  ).toMatchObject({
    ok: false,
    message:
      "Tu ne peux pas sanctionner ce membre : son rôle le plus haut égale ou dépasse le tien.",
  })
  expect(
    await changeTimeout(discord, staffMember, liftForm({ userId: HALDOR.id }))
  ).toMatchObject({
    ok: false,
    message:
      "Ce membre a la permission Administrateur : Discord ne l’exclut jamais temporairement.",
  })
  expect(await memberUpdateReasons(discord)).toEqual([])
})

test("an account that is not a member, or an ID that names none, cannot be timed out", async () => {
  const discord = discordWith()
  const staffMember = await staffMemberOn(discord)

  for (const userId of [OUTSIDER.id, "not-an-id"]) {
    expect(
      await changeTimeout(discord, staffMember, timeOutForm({ userId }))
    ).toMatchObject({
      ok: false,
      message: "Ce compte n’est pas membre du serveur Discord.",
    })
  }
  expect(discord.directMessagesTo(OUTSIDER.id)).toEqual([])
})

test("Discord unavailable during a timeout says it may or may not have landed, keeps the form, and sends no direct message", async () => {
  const discord = discordWith()
  discord.failNext(
    "modifyMember",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.guildMember,
      status: 503,
    })
  )

  const result = await changeTimeout(
    discord,
    await staffMemberOn(discord),
    timeOutForm()
  )

  expect(result).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : l’exclusion temporaire est peut-être passée, peut-être pas. Recharge la page pour vérifier, puis réessaie.",
    change: "time-out",
    reason: "Insultes répétées",
    duration: "3600",
    notify: true,
  })
  expect(discord.directMessagesTo(LYRA.id)).toEqual([])
})

test("Discord unavailable while a timeout is lifted says the lifting may or may not have landed", async () => {
  const discord = discordWith({
    communication_disabled_until: "2026-11-01T10:00:00.000Z",
  })
  discord.failNext(
    "getGuild",
    new DiscordError({ method: "GET", route: ROUTES.guild })
  )

  expect(
    await changeTimeout(discord, await staffMemberOn(discord), liftForm())
  ).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : la levée est peut-être passée, peut-être pas. Recharge la page pour vérifier, puis réessaie.",
    change: "lift",
    reason: "Erreur de cible",
  })
})

test("a panel error is thrown, before or after the timeout", async () => {
  const missingPermissions = new DiscordError({
    method: "PATCH",
    route: ROUTES.guildMember,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
  })
  const before = discordWith()
  before.failNext("modifyMember", missingPermissions)
  const after = discordWith()
  after.failNext(
    "createMessage",
    new DiscordError({
      method: "POST",
      route: ROUTES.channelMessages,
      status: 400,
      code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
    })
  )

  await expect(
    changeTimeout(before, await staffMemberOn(before), timeOutForm())
  ).rejects.toBe(missingPermissions)
  await expect(
    changeTimeout(after, await staffMemberOn(after), timeOutForm())
  ).rejects.toMatchObject({ status: 400 })
})

test("a staff member who does not moderate cannot change a timeout", async () => {
  const discord = discordWith()

  await expect(
    changeTimeout(
      discord,
      await staffMemberOn(discord, BRYNJA.id),
      timeOutForm({ notify: false })
    )
  ).rejects.toThrow()
  expect(await timeoutEndOf(discord, LYRA.id)).toBeNull()
})
