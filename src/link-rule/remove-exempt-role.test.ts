import {
  AuditLogEvent,
  AutoModerationActionType,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { addExemptRole } from "./add-exempt-role"
import { newLinkRule } from "./link-rule"
import { readLinkRule } from "./read-link-rule"
import { removeExemptRole } from "./remove-exempt-role"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GUARD_ROLE_ID = "1300000000000000010"

const MODERATOR_ROLE_ID = "1300000000000000011"

const GONE_ROLE_ID = "1300000000000000999"

const GALLERY_ID = "1500000000000000001"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

function discordWithStaff() {
  return new FakeDiscord({
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: GUARD_ROLE_ID, name: "Garde" },
      { id: MODERATOR_ROLE_ID, name: "Modérateur" },
    ],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
    ],
  })
}

async function staffMemberOn(discord: FakeDiscord, user = ALDIS) {
  const staffMember = await findStaffMember(
    discord,
    { staffRoleId: STAFF_ROLE_ID, moderationRoleIds: [], banRoleIds: [] },
    user.id
  )
  if (staffMember === null) {
    throw new Error(`${user.username} is no staff member`)
  }
  return staffMember
}

function form(role: string) {
  const data = new FormData()
  data.set("role", role)
  return data
}

async function withTheLinkRule() {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const enabled = new FormData()
  enabled.set("enabled", "true")
  await switchLinkRule(discord, staffMember, enabled)
  return { discord, staffMember }
}

function createdLinkRuleWith(discord: FakeDiscord, exemptRoles: string[]) {
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...newLinkRule(STAFF_ROLE_ID),
    exempt_roles: exemptRoles,
  })
}

async function exemptRolesOf(discord: FakeDiscord) {
  const [rule] = await discord.listAutoModerationRules()
  return rule?.exempt_roles ?? []
}

test("a role added then removed leaves the rule as it was, the staff role and the other roles staying, and the audit log names each write", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const [before] = await discord.listAutoModerationRules()
  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  await addExemptRole(discord, staffMember, form(MODERATOR_ROLE_ID))

  const result = await removeExemptRole(
    discord,
    staffMember,
    form(GUARD_ROLE_ID)
  )

  expect(result).toEqual({
    ok: true,
    message: "« Garde » n’est plus un rôle exempté.",
  })
  expect(await exemptRolesOf(discord)).toEqual([
    STAFF_ROLE_ID,
    MODERATOR_ROLE_ID,
  ])
  await removeExemptRole(discord, staffMember, form(MODERATOR_ROLE_ID))
  const [after] = await discord.listAutoModerationRules()
  expect(after).toEqual(before)
  expect(
    (await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })).exemptRoles
  ).toEqual([{ id: STAFF_ROLE_ID, name: "Staff" }])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du rôle exempté « Modérateur »",
    "aldis (1400000000000000001) : retrait du rôle exempté « Garde »",
    "aldis (1400000000000000001) : ajout du rôle exempté « Modérateur »",
    "aldis (1400000000000000001) : ajout du rôle exempté « Garde »",
  ])
})

test("the staff role is not removed, however the form is sent: the removal is refused in French, the role handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const result = await removeExemptRole(
    discord,
    staffMember,
    form(STAFF_ROLE_ID)
  )

  expect(result).toEqual({
    ok: false,
    message: "Le rôle du staff est toujours exempté : il ne se retire pas.",
    role: STAFF_ROLE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("an empty choice, or none sent, is refused in French with the field handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()

  const empty = await removeExemptRole(discord, staffMember, form(""))
  const none = await removeExemptRole(discord, staffMember, new FormData())

  const refusal = "Choisis le rôle à retirer."
  expect(empty).toEqual({ ok: false, message: refusal, role: "" })
  expect(none).toEqual({ ok: false, message: refusal, role: "" })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("a role that the rule no longer exempts is removed with no write, as two staff members who press together do not fail each other", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const result = await removeExemptRole(
    discord,
    staffMember,
    form(GUARD_ROLE_ID)
  )

  expect(result).toEqual({
    ok: true,
    message: "« Garde » n’est plus un rôle exempté.",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a role that the Discord server no longer lists is removed all the same, and the audit log names it by its ID", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  createdLinkRuleWith(discord, [STAFF_ROLE_ID, GONE_ROLE_ID])

  const result = await removeExemptRole(
    discord,
    staffMember,
    form(GONE_ROLE_ID)
  )

  expect(result).toEqual({
    ok: true,
    message: `« ${GONE_ROLE_ID} » n’est plus un rôle exempté.`,
  })
  expect(await exemptRolesOf(discord)).toEqual([STAFF_ROLE_ID])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    `aldis (1400000000000000001) : retrait du rôle exempté « ${GONE_ROLE_ID} »`,
  ])
})

test("the write re-reads the rule and removes its own role alone: what the staff changed in Discord, and the roles that another staff member added since, stay", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, created?.id ?? "", {
    enabled: false,
    exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID, GONE_ROLE_ID],
    exempt_channels: [GALLERY_ID],
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: { custom_message: "Écrit dans Discord" },
      },
      {
        type: AutoModerationActionType.Timeout,
        metadata: { duration_seconds: 60 },
      },
    ],
  })
  const [edited] = await discord.listAutoModerationRules()

  await addExemptRole(discord, bryn, form(MODERATOR_ROLE_ID))
  await removeExemptRole(discord, staffMember, form(GUARD_ROLE_ID))

  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...edited,
    exempt_roles: [STAFF_ROLE_ID, GONE_ROLE_ID, MODERATOR_ROLE_ID],
  })
})

test("each removal is recorded in the audit log under the staff member's name and Discord ID, naming the role", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  await addExemptRole(discord, staffMember, form(MODERATOR_ROLE_ID))

  await removeExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  await removeExemptRole(discord, bryn, form(MODERATOR_ROLE_ID))

  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason).slice(0, 2)).toEqual([
    "bryn (1400000000000000002) : retrait du rôle exempté « Modérateur »",
    "aldis (1400000000000000001) : retrait du rôle exempté « Garde »",
  ])
})

test("before the link rule exists, the removal is refused, the role handed back as typed, and nothing is created", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const result = await removeExemptRole(
    discord,
    staffMember,
    form(GUARD_ROLE_ID)
  )

  expect(result).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis retire le rôle.",
    role: GUARD_ROLE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the read before it, the staff are told to reload and check, and the role comes back as typed", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await removeExemptRole(
    discord,
    staffMember,
    form(GUARD_ROLE_ID)
  )
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const read = await removeExemptRole(discord, staffMember, form(GUARD_ROLE_ID))

  expect(write).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    role: GUARD_ROLE_ID,
  })
  expect(read).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    role: GUARD_ROLE_ID,
  })
  expect(await exemptRolesOf(discord)).toEqual([STAFF_ROLE_ID, GUARD_ROLE_ID])
})

test("a panel error is thrown, not returned", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  const missingPermissions = new DiscordError({
    method: "PATCH",
    route: ROUTES.autoModerationRule,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("modifyAutoModerationRule", missingPermissions)

  await expect(
    removeExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  ).rejects.toBe(missingPermissions)
})
