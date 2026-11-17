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
import { readLinkRule } from "./read-link-rule"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GUARD_ROLE_ID = "1300000000000000010"

const MODERATOR_ROLE_ID = "1300000000000000011"

const INTEGRATION_ROLE_ID = "1300000000000000012"

const GONE_ROLE_ID = "1300000000000000999"

const GALLERY_ID = "1500000000000000001"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

function roleId(index: number) {
  return `13000000000001${String(index).padStart(4, "0")}`
}

function discordWithStaff(extraRoleCount = 0) {
  return new FakeDiscord({
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: GUARD_ROLE_ID, name: "Garde" },
      { id: MODERATOR_ROLE_ID, name: "Modérateur" },
      { id: INTEGRATION_ROLE_ID, name: "Intégration", managed: true },
      ...Array.from({ length: extraRoleCount }, (_, index) => ({
        id: roleId(index),
        name: `Rôle ${index}`,
      })),
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

async function withTheLinkRule(extraRoleCount = 0) {
  const discord = discordWithStaff(extraRoleCount)
  const staffMember = await staffMemberOn(discord)
  const enabled = new FormData()
  enabled.set("enabled", "true")
  await switchLinkRule(discord, staffMember, enabled)
  return { discord, staffMember }
}

async function exemptRolesOf(discord: FakeDiscord) {
  const [rule] = await discord.listAutoModerationRules()
  return rule?.exempt_roles ?? []
}

test("a role added joins the staff role among the exempt roles, which read back with their names, and the audit log names it", async () => {
  const { discord, staffMember } = await withTheLinkRule()

  const result = await addExemptRole(
    discord,
    staffMember,
    form(MODERATOR_ROLE_ID)
  )

  expect(result).toEqual({
    ok: true,
    message: "« Modérateur » est maintenant un rôle exempté.",
  })
  expect(await exemptRolesOf(discord)).toEqual([
    STAFF_ROLE_ID,
    MODERATOR_ROLE_ID,
  ])
  const { exemptRoles } = await readLinkRule(discord, {
    staffRoleId: STAFF_ROLE_ID,
  })
  expect(exemptRoles).toEqual([
    { id: STAFF_ROLE_ID, name: "Staff" },
    { id: MODERATOR_ROLE_ID, name: "Modérateur" },
  ])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : ajout du rôle exempté « Modérateur »",
  ])
})

test("an empty choice, or none sent, is refused in French with the field handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const empty = await addExemptRole(discord, staffMember, form(""))
  const none = await addExemptRole(discord, staffMember, new FormData())

  const refusal = "Choisis le rôle à exempter."
  expect(empty).toEqual({ ok: false, message: refusal, role: "" })
  expect(none).toEqual({ ok: false, message: refusal, role: "" })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a role that the rule exempts already, the staff role included, is refused and handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const guard = await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  const staff = await addExemptRole(discord, staffMember, form(STAFF_ROLE_ID))

  expect(guard).toEqual({
    ok: false,
    message: "« Garde » est déjà un rôle exempté.",
    role: GUARD_ROLE_ID,
  })
  expect(staff).toEqual({
    ok: false,
    message: "« Staff » est déjà un rôle exempté.",
    role: STAFF_ROLE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a role that the Discord server no longer lists is refused with a message that says to reload, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()

  const result = await addExemptRole(discord, staffMember, form(GONE_ROLE_ID))

  expect(result).toEqual({
    ok: false,
    message:
      "Ce rôle n’existe plus sur le serveur Discord : recharge la page, puis choisis-en un autre.",
    role: GONE_ROLE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("@everyone and a role that an integration manages are refused as roles that the panel does not exempt, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const refusal =
    "Ce rôle ne peut pas être exempté : le panel n’exempte ni « @everyone » ni un rôle géré par une intégration."

  const everyone = await addExemptRole(
    discord,
    staffMember,
    form(discord.guildId)
  )
  const managed = await addExemptRole(
    discord,
    staffMember,
    form(INTEGRATION_ROLE_ID)
  )

  expect(everyone).toEqual({
    ok: false,
    message: refusal,
    role: discord.guildId,
  })
  expect(managed).toEqual({
    ok: false,
    message: refusal,
    role: INTEGRATION_ROLE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("the rule exempts 20 roles at most, the staff role counting: the 21st is refused in the panel's own message, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule(20)
  for (let index = 0; index < 19; index++) {
    const added = await addExemptRole(discord, staffMember, form(roleId(index)))
    expect(added.ok).toBe(true)
  }
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const refused = await addExemptRole(discord, staffMember, form(roleId(19)))

  expect(await exemptRolesOf(discord)).toHaveLength(20)
  expect(refused).toEqual({
    ok: false,
    message:
      "La règle des liens exempte déjà 20 rôles sur 20, celui du staff compris. Retire un rôle exempté, puis réessaie.",
    role: roleId(19),
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("the write re-reads the rule and adds its own role alone: what the staff changed in Discord, and the roles that another staff member added since, stay", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, created?.id ?? "", {
    enabled: false,
    exempt_roles: [STAFF_ROLE_ID, GONE_ROLE_ID],
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
    trigger_metadata: {
      ...created?.trigger_metadata,
      allow_list: [
        ...(created?.trigger_metadata.allow_list ?? []),
        "*youtube.com",
      ],
    },
  })
  const [edited] = await discord.listAutoModerationRules()

  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  await addExemptRole(discord, bryn, form(MODERATOR_ROLE_ID))

  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...edited,
    exempt_roles: [
      STAFF_ROLE_ID,
      GONE_ROLE_ID,
      GUARD_ROLE_ID,
      MODERATOR_ROLE_ID,
    ],
  })
})

test("each addition is recorded in the audit log under the staff member's name and Discord ID, naming the role", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)

  await addExemptRole(discord, staffMember, form(GUARD_ROLE_ID))
  await addExemptRole(discord, bryn, form(MODERATOR_ROLE_ID))

  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "bryn (1400000000000000002) : ajout du rôle exempté « Modérateur »",
    "aldis (1400000000000000001) : ajout du rôle exempté « Garde »",
  ])
})

test("before the link rule exists, the role is refused, handed back as typed, and the rule is not created", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const result = await addExemptRole(
    discord,
    staffMember,
    form(MODERATOR_ROLE_ID)
  )

  expect(result).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis ajoute le rôle.",
    role: MODERATOR_ROLE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the reads before it, the staff are told to reload and check, and the role comes back as typed", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await addExemptRole(
    discord,
    staffMember,
    form(MODERATOR_ROLE_ID)
  )
  discord.failNext(
    "listRoles",
    new DiscordError({ method: "GET", route: ROUTES.guildRoles })
  )

  const read = await addExemptRole(
    discord,
    staffMember,
    form(MODERATOR_ROLE_ID)
  )

  expect(write).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    role: MODERATOR_ROLE_ID,
  })
  expect(read).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    role: MODERATOR_ROLE_ID,
  })
  expect(await exemptRolesOf(discord)).toEqual([STAFF_ROLE_ID])
})

test("a panel error is thrown, not returned", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const missingPermissions = new DiscordError({
    method: "PATCH",
    route: ROUTES.autoModerationRule,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("modifyAutoModerationRule", missingPermissions)

  await expect(
    addExemptRole(discord, staffMember, form(MODERATOR_ROLE_ID))
  ).rejects.toBe(missingPermissions)
})
