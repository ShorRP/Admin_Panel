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
import { readLinkRule } from "./read-link-rule"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GALLERY_ID = "1500000000000000001"

const NEWS_ID = "1500000000000000002"

const GAMES_ID = "1500000000000000003"

const VOICE_ID = "1500000000000000004"

const STAGE_ID = "1500000000000000005"

const FORUM_ID = "1500000000000000006"

const MEDIA_ID = "1500000000000000007"

const GONE_ID = "1500000000000000999"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

function channelId(index: number) {
  return `15000000000001${String(index).padStart(4, "0")}`
}

function discordWithStaff(extraChannelCount = 0) {
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
      { id: VOICE_ID, name: "salon vocal", type: ChannelType.GuildVoice },
      { id: STAGE_ID, name: "scène", type: ChannelType.GuildStageVoice },
      { id: FORUM_ID, name: "idées", type: ChannelType.GuildForum },
      { id: MEDIA_ID, name: "médias", type: ChannelType.GuildMedia },
      ...Array.from({ length: extraChannelCount }, (_, index) => ({
        id: channelId(index),
        name: `salon-${index}`,
      })),
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

async function withTheLinkRule(extraChannelCount = 0) {
  const discord = discordWithStaff(extraChannelCount)
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

test("a channel added joins the exempt channels, which read back with their names, and the audit log names it", async () => {
  const { discord, staffMember } = await withTheLinkRule()

  const result = await addExemptChannel(discord, staffMember, form(GALLERY_ID))

  expect(result).toEqual({
    ok: true,
    message: "« #galerie » est maintenant un salon exempté.",
  })
  expect(await exemptChannelsOf(discord)).toEqual([GALLERY_ID])
  const { exemptChannels } = await readLinkRule(discord, {
    staffRoleId: STAFF_ROLE_ID,
  })
  expect(exemptChannels).toEqual([
    { id: GALLERY_ID, name: "galerie", category: false },
  ])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : ajout du salon exempté « #galerie »",
  ])
})

test("an announcement channel and a category are added too, the category named as one", async () => {
  const { discord, staffMember } = await withTheLinkRule()

  const news = await addExemptChannel(discord, staffMember, form(NEWS_ID))
  const games = await addExemptChannel(discord, staffMember, form(GAMES_ID))

  expect(news).toEqual({
    ok: true,
    message: "« #nouvelles » est maintenant un salon exempté.",
  })
  expect(games).toEqual({
    ok: true,
    message: "« Jeux (catégorie) » est maintenant un salon exempté.",
  })
  expect(await exemptChannelsOf(discord)).toEqual([NEWS_ID, GAMES_ID])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : ajout du salon exempté « Jeux (catégorie) »",
    "aldis (1400000000000000001) : ajout du salon exempté « #nouvelles »",
  ])
})

test("an empty choice, or none sent, is refused in French with the field handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const empty = await addExemptChannel(discord, staffMember, form(""))
  const none = await addExemptChannel(discord, staffMember, new FormData())

  const refusal = "Choisis le salon à exempter."
  expect(empty).toEqual({ ok: false, message: refusal, channel: "" })
  expect(none).toEqual({ ok: false, message: refusal, channel: "" })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a channel that the rule exempts already is refused and handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const result = await addExemptChannel(discord, staffMember, form(GALLERY_ID))

  expect(result).toEqual({
    ok: false,
    message: "« #galerie » est déjà un salon exempté.",
    channel: GALLERY_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a channel that the Discord server does not list is refused with a message that says to reload, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()

  const result = await addExemptChannel(discord, staffMember, form(GONE_ID))

  expect(result).toEqual({
    ok: false,
    message:
      "Le panel ne trouve plus ce salon sur le serveur Discord : recharge la page, puis choisis-en un autre.",
    channel: GONE_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("a voice channel, a stage, a forum and a media channel are refused as channels that the panel does not exempt, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const refusal =
    "Ce salon ne peut pas être exempté : le panel exempte un salon textuel, un salon d’annonces ou une catégorie."

  for (const id of [VOICE_ID, STAGE_ID, FORUM_ID, MEDIA_ID]) {
    const result = await addExemptChannel(discord, staffMember, form(id))

    expect(result, id).toEqual({ ok: false, message: refusal, channel: id })
  }
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("the rule exempts 50 channels at most: the 51st is refused in the panel's own message, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule(51)
  for (let index = 0; index < 50; index++) {
    const added = await addExemptChannel(
      discord,
      staffMember,
      form(channelId(index))
    )
    expect(added.ok).toBe(true)
  }
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const refused = await addExemptChannel(
    discord,
    staffMember,
    form(channelId(50))
  )

  expect(await exemptChannelsOf(discord)).toHaveLength(50)
  expect(refused).toEqual({
    ok: false,
    message:
      "La règle des liens exempte déjà 50 salons sur 50. Retire un salon exempté, puis réessaie.",
    channel: channelId(50),
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("the write re-reads the rule and adds its own channel alone: what the staff changed in Discord, and the channels that another staff member added since, stay", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, created?.id ?? "", {
    enabled: false,
    exempt_roles: [STAFF_ROLE_ID],
    exempt_channels: [GONE_ID],
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

  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  await addExemptChannel(discord, bryn, form(NEWS_ID))

  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...edited,
    exempt_channels: [GONE_ID, GALLERY_ID, NEWS_ID],
  })
})

test("each addition is recorded in the audit log under the staff member's name and Discord ID, naming the channel", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)

  await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  await addExemptChannel(discord, bryn, form(NEWS_ID))

  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "bryn (1400000000000000002) : ajout du salon exempté « #nouvelles »",
    "aldis (1400000000000000001) : ajout du salon exempté « #galerie »",
  ])
})

test("before the link rule exists, the channel is refused, handed back as typed, and the rule is not created", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const result = await addExemptChannel(discord, staffMember, form(GALLERY_ID))

  expect(result).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis ajoute le salon.",
    channel: GALLERY_ID,
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the reads before it, the staff are told to reload and check, and the channel comes back as typed", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await addExemptChannel(discord, staffMember, form(GALLERY_ID))
  discord.failNext(
    "listChannels",
    new DiscordError({ method: "GET", route: ROUTES.guildChannels })
  )

  const read = await addExemptChannel(discord, staffMember, form(GALLERY_ID))

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
  expect(await exemptChannelsOf(discord)).toEqual([])
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
    addExemptChannel(discord, staffMember, form(GALLERY_ID))
  ).rejects.toBe(missingPermissions)
})
