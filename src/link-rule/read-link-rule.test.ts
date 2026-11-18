import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  ChannelType,
  type RESTPostAPIAutoModerationRuleJSONBody,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeDiscordState } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { readLinkRule } from "./read-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GUARD_ROLE_ID = "1300000000000000010"

const GALLERY_ID = "1500000000000000001"

const GAMES_ID = "1500000000000000002"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const STAFF = { id: STAFF_ROLE_ID, name: "Staff" }

function discordOn(state: FakeDiscordState = {}) {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    ...state,
  })
}

function linkRule(
  overrides: Partial<RESTPostAPIAutoModerationRuleJSONBody> = {}
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: "Liens bloqués du panel",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { regex_patterns: ["https?://[^\\s/?#]+"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: true,
    ...overrides,
  }
}

function entriesOf(domain: string) {
  return [
    `https://${domain}`,
    `https://${domain}/*`,
    `https://www.${domain}`,
    `https://www.${domain}/*`,
  ]
}

async function readOn(discord: FakeDiscord) {
  return await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })
}

test("before the link rule exists, the settings are the ones that « Activer » creates, with the rule's status absent, and reading creates nothing", async () => {
  const discord = discordOn({ roles: [STAFF] })

  const settings = await readOn(discord)

  expect(settings).toEqual({
    status: "absent",
    allowedDomains: [
      "cdn.discordapp.com",
      "giphy.com",
      "klipy.com",
      "media.discordapp.net",
      "tenor.com",
      "twitch.tv",
      "youtu.be",
      "youtube.com",
    ],
    otherExceptions: [],
    exemptRoles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    exemptableRoles: [],
    staffRoleId: STAFF_ROLE_ID,
    exemptChannels: [],
    exemptableChannels: [],
    action: "block",
    alert: { kind: "none" },
    alertableChannels: [],
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("the roles that the staff can choose are the Discord server's, from the highest in its hierarchy, but @everyone, the roles that an integration manages and those that the rule exempts already", async () => {
  const discord = discordOn({
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 5 },
      { id: GUARD_ROLE_ID, name: "Garde", position: 3 },
      { id: "1300000000000000011", name: "Modérateur", position: 4 },
      {
        id: "1300000000000000012",
        name: "Intégration",
        position: 9,
        managed: true,
      },
      { id: "1300000000000000013", name: "Membre", position: 1 },
    ],
  })
  const absent = await readOn(discord)
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({ exempt_roles: [STAFF_ROLE_ID, "1300000000000000013"] })
  )

  const present = await readOn(discord)

  expect(absent.exemptableRoles).toEqual([
    { id: "1300000000000000011", name: "Modérateur" },
    { id: GUARD_ROLE_ID, name: "Garde" },
    { id: "1300000000000000013", name: "Membre" },
  ])
  expect(present.exemptableRoles).toEqual([
    { id: "1300000000000000011", name: "Modérateur" },
    { id: GUARD_ROLE_ID, name: "Garde" },
  ])
})

test("a rule that no longer exempts the staff role offers it among the roles to choose, and the settings hold the staff role either way", async () => {
  const discord = discordOn({
    roles: [STAFF, { id: GUARD_ROLE_ID, name: "Garde" }],
  })
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({ exempt_roles: [GUARD_ROLE_ID] })
  )

  const settings = await readOn(discord)

  expect(settings.exemptableRoles.map(({ id }) => id)).toEqual([STAFF_ROLE_ID])
  expect(settings.staffRoleId).toBe(STAFF_ROLE_ID)
})

test("a rule that is on or off reads as so, and the rule's own settings replace the defaults", async () => {
  const discord = discordOn({ roles: [STAFF] })
  const rule = discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      trigger_metadata: {
        regex_patterns: ["https?://[^\\s/?#]+"],
        allow_list: [...entriesOf("twitch.tv"), ...entriesOf("arte.tv")],
      },
    })
  )

  const enabled = await readOn(discord)
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { enabled: false })
  const disabled = await readOn(discord)

  expect(enabled).toMatchObject({
    status: "enabled",
    allowedDomains: ["arte.tv", "twitch.tv"],
    otherExceptions: [],
    exemptRoles: [],
    exemptChannels: [],
    exemptableChannels: [],
    action: "block",
  })
  expect(disabled.status).toBe("disabled")
})

test("an allow list entry that is not part of a domain's four entries is an other exception, in the rule's order, and a domain missing one of its four is no allowed domain", async () => {
  const discord = discordOn()
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      trigger_metadata: {
        regex_patterns: ["https?://[^\\s/?#]+"],
        allow_list: [
          "*youtube.com",
          ...entriesOf("youtube.com"),
          "https://m.youtube.com/*",
          "https://arte.tv",
          "https://arte.tv/*",
          "https://www.arte.tv",
          "bit.ly",
        ],
      },
    })
  )

  const { allowedDomains, otherExceptions } = await readOn(discord)

  expect(allowedDomains).toEqual(["youtube.com"])
  expect(otherExceptions).toEqual([
    "*youtube.com",
    "https://m.youtube.com/*",
    "https://arte.tv",
    "https://arte.tv/*",
    "https://www.arte.tv",
    "bit.ly",
  ])
})

test("the exempt roles and channels read with their names, one that Discord does not list with none", async () => {
  const discord = discordOn({
    roles: [STAFF, { id: GUARD_ROLE_ID, name: "Garde" }],
    channels: [
      { id: GALLERY_ID, name: "galerie" },
      { id: GAMES_ID, name: "Jeux", type: ChannelType.GuildCategory },
    ],
  })
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID, "1300000000000000999"],
      exempt_channels: [GALLERY_ID, GAMES_ID, "1500000000000000999"],
    })
  )

  const { exemptRoles, exemptChannels } = await readOn(discord)

  expect(exemptRoles).toEqual([
    { id: STAFF_ROLE_ID, name: "Staff" },
    { id: GUARD_ROLE_ID, name: "Garde" },
    { id: "1300000000000000999", name: null },
  ])
  expect(exemptChannels).toEqual([
    { id: GALLERY_ID, name: "galerie", category: false },
    { id: GAMES_ID, name: "Jeux", category: true },
    { id: "1500000000000000999", name: null, category: false },
  ])
})

test("a read of the channels that fails fails the read, even with no exempt channel, since the choice of a channel needs them", async () => {
  const discord = discordOn({ roles: [STAFF] })
  discord.createAutoModerationRuleAs(ALDIS.id, linkRule())
  const failure = new DiscordError({
    method: "GET",
    route: ROUTES.guildChannels,
  })
  discord.failNext("listChannels", failure)

  await expect(readOn(discord)).rejects.toBe(failure)
})

test("the channels that the staff can choose are the text and announcement channels and the categories of the Discord server, a category first in a group of its own name and a channel with no category before the groups, each in French alphabetical order, but voice, stage, forum and media channels and those that the rule exempts already", async () => {
  const discord = discordOn({
    channels: [
      { id: "20", name: "Zèbre" },
      { id: "21", name: "écran", type: ChannelType.GuildAnnouncement },
      { id: "22", name: "Jeux", type: ChannelType.GuildCategory },
      { id: "23", name: "tournois", parent_id: "22" },
      { id: "24", name: "annonces", parent_id: "22" },
      {
        id: "25",
        name: "salon vocal",
        type: ChannelType.GuildVoice,
        parent_id: "22",
      },
      { id: "26", name: "scène", type: ChannelType.GuildStageVoice },
      { id: "27", name: "idées", type: ChannelType.GuildForum },
      { id: "28", name: "médias", type: ChannelType.GuildMedia },
      { id: "29", name: "Accueil", type: ChannelType.GuildCategory },
      { id: "30", name: "règles", parent_id: "29" },
      { id: "31", name: "vide", type: ChannelType.GuildCategory },
      { id: "32", name: "orphelin", parent_id: "99" },
    ],
  })
  const absent = await readOn(discord)
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({ exempt_channels: ["23", "29"] })
  )

  const present = await readOn(discord)

  const choice = (id: string, name: string, category = false) => ({
    id,
    name,
    category,
  })
  expect(absent.exemptableChannels).toEqual([
    {
      id: null,
      label: null,
      choices: [
        choice("21", "écran"),
        choice("32", "orphelin"),
        choice("20", "Zèbre"),
      ],
    },
    {
      id: "29",
      label: "Accueil",
      choices: [choice("29", "Accueil", true), choice("30", "règles")],
    },
    {
      id: "22",
      label: "Jeux",
      choices: [
        choice("22", "Jeux", true),
        choice("24", "annonces"),
        choice("23", "tournois"),
      ],
    },
    { id: "31", label: "vide", choices: [choice("31", "vide", true)] },
  ])
  expect(present.exemptableChannels).toEqual([
    {
      id: null,
      label: null,
      choices: [
        choice("21", "écran"),
        choice("32", "orphelin"),
        choice("20", "Zèbre"),
      ],
    },
    { id: "29", label: "Accueil", choices: [choice("30", "règles")] },
    {
      id: "22",
      label: "Jeux",
      choices: [choice("22", "Jeux", true), choice("24", "annonces")],
    },
    { id: "31", label: "vide", choices: [choice("31", "vide", true)] },
  ])
})

test("the action is read from the rule's actions: blocking alone, with a timeout of an hour or of a day, or one that Discord's own settings made, which reads as none, an alert to a channel being left out of the reading", async () => {
  const discord = discordOn()
  const block = { type: AutoModerationActionType.BlockMessage }
  const timeout = (seconds: number) => ({
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: seconds },
  })
  const alert = {
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: GALLERY_ID },
  }
  const rule = discord.createAutoModerationRuleAs(ALDIS.id, linkRule())
  const actionAfter = async (
    actions: RESTPostAPIAutoModerationRuleJSONBody["actions"]
  ) => {
    discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { actions })
    return (await readOn(discord)).action
  }

  expect(await actionAfter([block])).toBe("block")
  expect(await actionAfter([block, timeout(3600)])).toBe("timeout-1h")
  expect(await actionAfter([block, timeout(86400)])).toBe("timeout-1d")
  expect(await actionAfter([block, alert])).toBe("block")
  expect(await actionAfter([alert, block, timeout(86400)])).toBe("timeout-1d")
  expect(await actionAfter([block, timeout(60)])).toBeNull()
  expect(await actionAfter([timeout(3600)])).toBeNull()
  expect(await actionAfter([alert])).toBeNull()
})

test("only a keyword rule of exactly that name is the link rule", async () => {
  const discord = discordOn()
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      trigger_type: AutoModerationRuleTriggerType.MentionSpam,
      trigger_metadata: { mention_total_limit: 5 },
    })
  )
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({ name: "Liens bloqués du panel " })
  )

  expect((await readOn(discord)).status).toBe("absent")
})

test("the alert channel is read from the rule's actions, whatever the action the rule holds beside it: none without an alert, the channel with its name, or one that Discord does not list with none", async () => {
  const discord = discordOn({
    channels: [{ id: GALLERY_ID, name: "galerie" }],
  })
  const block = { type: AutoModerationActionType.BlockMessage }
  const timeout = {
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: 3600 },
  }
  const alertTo = (channelId: string) => ({
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: channelId },
  })
  const rule = discord.createAutoModerationRuleAs(ALDIS.id, linkRule())
  const alertAfter = async (
    actions: RESTPostAPIAutoModerationRuleJSONBody["actions"]
  ) => {
    discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { actions })
    return (await readOn(discord)).alert
  }
  const gallery = { kind: "channel", id: GALLERY_ID, name: "galerie" }

  expect(await alertAfter([block])).toEqual({ kind: "none" })
  expect(await alertAfter([block, timeout])).toEqual({ kind: "none" })
  expect(await alertAfter([block, alertTo(GALLERY_ID)])).toEqual(gallery)
  expect(await alertAfter([alertTo(GALLERY_ID), block, timeout])).toEqual(
    gallery
  )
  expect(await alertAfter([block, alertTo(GALLERY_ID), timeout])).toEqual(
    gallery
  )
  expect(await alertAfter([block, alertTo("1500000000000000999")])).toEqual({
    kind: "channel",
    id: "1500000000000000999",
    name: null,
  })
})

test("an alert that the panel cannot write back whole reads as set in Discord: a second alert, an alert with no channel, and an alert that is the rule's only action, which the action's own reading calls foreign too", async () => {
  const discord = discordOn({
    channels: [
      { id: GALLERY_ID, name: "galerie" },
      { id: GAMES_ID, name: "jeux" },
    ],
  })
  const block = { type: AutoModerationActionType.BlockMessage }
  const alertTo = (channelId: string) => ({
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: channelId },
  })
  const rule = discord.createAutoModerationRuleAs(ALDIS.id, linkRule())
  const settingsAfter = async (
    actions: RESTPostAPIAutoModerationRuleJSONBody["actions"]
  ) => {
    discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { actions })
    const { alert, action } = await readOn(discord)
    return { alert, action }
  }
  const foreign = { kind: "set-in-discord" }

  expect(
    await settingsAfter([block, alertTo(GALLERY_ID), alertTo(GAMES_ID)])
  ).toEqual({ alert: foreign, action: "block" })
  expect(
    await settingsAfter([
      block,
      { type: AutoModerationActionType.SendAlertMessage },
    ])
  ).toEqual({ alert: foreign, action: "block" })
  expect(await settingsAfter([alertTo(GALLERY_ID)])).toEqual({
    alert: foreign,
    action: null,
  })
})

test("the channels that the staff can choose for the alert are the text and announcement channels of the Discord server, by group of category as the exempt channels' are, a category being no place to post an alert, and no voice, stage, forum or media channel", async () => {
  const discord = discordOn({
    channels: [
      { id: "20", name: "Zèbre" },
      { id: "21", name: "écran", type: ChannelType.GuildAnnouncement },
      { id: "22", name: "Jeux", type: ChannelType.GuildCategory },
      { id: "23", name: "tournois", parent_id: "22" },
      {
        id: "25",
        name: "salon vocal",
        type: ChannelType.GuildVoice,
        parent_id: "22",
      },
      { id: "26", name: "scène", type: ChannelType.GuildStageVoice },
      { id: "27", name: "idées", type: ChannelType.GuildForum },
      { id: "28", name: "médias", type: ChannelType.GuildMedia },
      { id: "31", name: "vide", type: ChannelType.GuildCategory },
    ],
  })

  const { alertableChannels } = await readOn(discord)

  const choice = (id: string, name: string) => ({ id, name, category: false })
  expect(alertableChannels).toEqual([
    {
      id: null,
      label: null,
      choices: [choice("21", "écran"), choice("20", "Zèbre")],
    },
    { id: "22", label: "Jeux", choices: [choice("23", "tournois")] },
  ])
})
