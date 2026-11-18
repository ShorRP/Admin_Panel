import {
  AuditLogEvent,
  AutoModerationActionType,
  ChannelType,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { addExemptChannel } from "./add-exempt-channel"
import { newLinkRule } from "./link-rule"
import { readLinkRule } from "./read-link-rule"
import { removeExemptChannel } from "./remove-exempt-channel"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GALLERY_ID = "1500000000000000001"

const NEWS_ID = "1500000000000000002"

const GAMES_ID = "1500000000000000003"

const GONE_ID = "1500000000000000999"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

function discordWithStaff() {
  return new FakeDiscord({
    roles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
    ],
    channels: [
      { id: GALLERY_ID, name: "galerie" },
      { id: NEWS_ID, name: "nouvelles", type: ChannelType.GuildAnnouncement },
      { id: GAMES_ID, name: "Jeux", type: ChannelType.GuildCategory },
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

function form(channel: string) {
  const data = new FormData()
  data.set("channel", channel)
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

async function exemptChannelsOf(discord: FakeDiscord) {
  const [rule] = await discord.listAutoModerationRules()
  return rule?.exempt_channels ?? []
}

test("a channel added then removed leaves the rule as it was, the other channels staying, and the audit log names each write", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const [before] = await discord.listAutoModerationRules()
  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  await addExemptChannel(discord, staffMember, form(NEWS_ID))

  const result = await removeExemptChannel(
    discord,
    staffMember,
    form(GALLERY_ID)
  )

  expect(result).toEqual({
    ok: true,
    message: "« #galerie » n’est plus un salon exempté.",
  })
  expect(await exemptChannelsOf(discord)).toEqual([NEWS_ID])
  await removeExemptChannel(discord, staffMember, form(NEWS_ID))
  const [after] = await discord.listAutoModerationRules()
  expect(after).toEqual(before)
  expect(
    (await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })).exemptChannels
  ).toEqual([])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du salon exempté « #nouvelles »",
    "aldis (1400000000000000001) : retrait du salon exempté « #galerie »",
    "aldis (1400000000000000001) : ajout du salon exempté « #nouvelles »",
    "aldis (1400000000000000001) : ajout du salon exempté « #galerie »",
  ])
})

test("a category is removed under its name, as a category", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptChannel(discord, staffMember, form(GAMES_ID))

  const result = await removeExemptChannel(discord, staffMember, form(GAMES_ID))

  expect(result).toEqual({
    ok: true,
    message: "« Jeux (catégorie) » n’est plus un salon exempté.",
  })
  expect(await exemptChannelsOf(discord)).toEqual([])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries[0]?.reason).toBe(
    "aldis (1400000000000000001) : retrait du salon exempté « Jeux (catégorie) »"
  )
})

test("an empty choice, or none sent, is refused in French with the field handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()

  const empty = await removeExemptChannel(discord, staffMember, form(""))
  const none = await removeExemptChannel(discord, staffMember, new FormData())

  const refusal = "Choisis le salon à retirer."
  expect(empty).toEqual({ ok: false, message: refusal, channel: "" })
  expect(none).toEqual({ ok: false, message: refusal, channel: "" })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("a channel that the rule no longer exempts is removed with no write, as two staff members who press together do not fail each other", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const result = await removeExemptChannel(
    discord,
    staffMember,
    form(GALLERY_ID)
  )

  expect(result).toEqual({
    ok: true,
    message: "« #galerie » n’est plus un salon exempté.",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a channel that the Discord server does not list is removed all the same, and the audit log names it by its ID", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...newLinkRule(STAFF_ROLE_ID),
    exempt_channels: [GALLERY_ID, GONE_ID],
  })

  const result = await removeExemptChannel(discord, staffMember, form(GONE_ID))

  expect(result).toEqual({
    ok: true,
    message: `« ${GONE_ID} » n’est plus un salon exempté.`,
  })
  expect(await exemptChannelsOf(discord)).toEqual([GALLERY_ID])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    `aldis (1400000000000000001) : retrait du salon exempté « ${GONE_ID} »`,
  ])
})

test("the write re-reads the rule and removes its own channel alone: what the staff changed in Discord, and the channels that another staff member added since, stay", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, created?.id ?? "", {
    enabled: false,
    exempt_roles: [STAFF_ROLE_ID, "1300000000000000999"],
    exempt_channels: [GALLERY_ID, GONE_ID],
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

  await addExemptChannel(discord, bryn, form(NEWS_ID))
  await removeExemptChannel(discord, staffMember, form(GALLERY_ID))

  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...edited,
    exempt_channels: [GONE_ID, NEWS_ID],
  })
})

test("each removal is recorded in the audit log under the staff member's name and Discord ID, naming the channel", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  await addExemptChannel(discord, staffMember, form(NEWS_ID))

  await removeExemptChannel(discord, staffMember, form(GALLERY_ID))
  await removeExemptChannel(discord, bryn, form(NEWS_ID))

  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason).slice(0, 2)).toEqual([
    "bryn (1400000000000000002) : retrait du salon exempté « #nouvelles »",
    "aldis (1400000000000000001) : retrait du salon exempté « #galerie »",
  ])
})

test("before the link rule exists, the removal is refused, the channel handed back as typed, and nothing is created", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const result = await removeExemptChannel(
    discord,
    staffMember,
    form(GALLERY_ID)
  )

  expect(result).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis retire le salon.",
    channel: GALLERY_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the read before it, the staff are told to reload and check, and the channel comes back as typed", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await removeExemptChannel(
    discord,
    staffMember,
    form(GALLERY_ID)
  )
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const read = await removeExemptChannel(discord, staffMember, form(GALLERY_ID))

  expect(write).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    channel: GALLERY_ID,
  })
  expect(read).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    channel: GALLERY_ID,
  })
  expect(await exemptChannelsOf(discord)).toEqual([GALLERY_ID])
})

test("a panel error is thrown, not returned", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  const missingPermissions = new DiscordError({
    method: "PATCH",
    route: ROUTES.autoModerationRule,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("modifyAutoModerationRule", missingPermissions)

  await expect(
    removeExemptChannel(discord, staffMember, form(GALLERY_ID))
  ).rejects.toBe(missingPermissions)
})
