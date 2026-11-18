import {
  AuditLogEvent,
  AutoModerationActionType,
  ChannelType,
  RESTJSONErrorCodes,
  type APIAutoModerationAction,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { changeAlertChannel } from "./change-alert-channel"
import { changeLinkRuleAction } from "./change-link-rule-action"
import { newLinkRule } from "./link-rule"
import { readLinkRule } from "./read-link-rule"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATOR_ROLE_ID = "1300000000000000011"

const GUARD_ROLE_ID = "1300000000000000010"

const ALERTS_ID = "1500000000000000009"

const JOURNAL_ID = "1500000000000000010"

const GALLERY_ID = "1500000000000000001"

const VOICE_ID = "1500000000000000020"

const GAMES_ID = "1500000000000000021"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const BLOCK_NOTICE =
  "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor."

const BLOCKING = {
  type: AutoModerationActionType.BlockMessage,
  metadata: { custom_message: BLOCK_NOTICE },
}

const TIMING_OUT_FOR_AN_HOUR = [
  {
    type: AutoModerationActionType.BlockMessage,
    metadata: {
      custom_message: `${BLOCK_NOTICE} Tu reçois une exclusion temporaire d’une heure.`,
    },
  },
  {
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: 3600 },
  },
]

function alertTo(channelId: string) {
  return {
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: channelId },
  }
}

const NO_RULE_MESSAGE =
  "La règle des liens n’existe pas encore : active-la d’abord, puis change le salon d’alerte."

const GONE_MESSAGE =
  "Le panel ne trouve plus ce salon sur le serveur Discord : recharge la page, puis choisis-en un autre."

const NOT_AN_ALERT_CHANNEL_MESSAGE =
  "Ce salon ne peut pas recevoir l’alerte : le panel l’envoie dans un salon textuel ou un salon d’annonces."

const SET_IN_DISCORD_MESSAGE =
  "Le salon d’alerte est réglé d’une façon que le panel ne sait pas écrire : il se change dans Discord."

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
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATOR_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
    ],
    channels: [
      { id: ALERTS_ID, name: "alertes" },
      { id: JOURNAL_ID, name: "journal", type: ChannelType.GuildAnnouncement },
      { id: GALLERY_ID, name: "galerie" },
      { id: VOICE_ID, name: "vocal", type: ChannelType.GuildVoice },
      { id: GAMES_ID, name: "Jeux", type: ChannelType.GuildCategory },
    ],
  })
}

async function staffMemberOn(discord: FakeDiscord, user = ALDIS) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF_ROLE_ID,
      moderationRoleIds: [MODERATOR_ROLE_ID],
      banRoleIds: [],
    },
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

function formOf(action: string) {
  const data = new FormData()
  data.set("action", action)
  return data
}

async function withTheLinkRule() {
  const discord = discordWithStaff()
  const moderator = await staffMemberOn(discord)
  const enabled = new FormData()
  enabled.set("enabled", "true")
  await switchLinkRule(discord, moderator, enabled)
  return { discord, moderator, member: await staffMemberOn(discord, BRYN) }
}

async function withARuleActing(actions: APIAutoModerationAction[]) {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...newLinkRule(STAFF_ROLE_ID),
    actions,
  })
  return {
    discord,
    moderator: await staffMemberOn(discord),
  }
}

async function actionsOf(discord: FakeDiscord) {
  const [rule] = await discord.listAutoModerationRules()
  return rule?.actions
}

async function auditReasons(discord: FakeDiscord) {
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  return audit_log_entries.map(({ reason }) => reason)
}

test("a channel chosen is the one the rule's actions alert once the rule is read back, and removing it takes the alert out, the audit log naming the channel each time", async () => {
  const { discord, moderator } = await withTheLinkRule()
  expect(await actionsOf(discord)).toEqual([BLOCKING])

  const chosen = await changeAlertChannel(discord, moderator, form(ALERTS_ID))
  const afterChoosing = await actionsOf(discord)
  const read = (await readLinkRule(discord, moderator)).alert
  const replaced = await changeAlertChannel(
    discord,
    moderator,
    form(JOURNAL_ID)
  )
  const afterReplacing = await actionsOf(discord)
  const removed = await changeAlertChannel(discord, moderator, form(""))

  expect(chosen).toEqual({
    ok: true,
    message:
      "« #alertes » est maintenant le salon d’alerte de la règle des liens.",
  })
  expect(afterChoosing).toEqual([BLOCKING, alertTo(ALERTS_ID)])
  expect(read).toEqual({ kind: "channel", id: ALERTS_ID, name: "alertes" })
  expect(replaced).toEqual({
    ok: true,
    message:
      "« #journal » est maintenant le salon d’alerte de la règle des liens.",
  })
  expect(afterReplacing).toEqual([BLOCKING, alertTo(JOURNAL_ID)])
  expect(removed).toEqual({
    ok: true,
    message: "La règle des liens n’a plus de salon d’alerte.",
  })
  expect(await actionsOf(discord)).toEqual([BLOCKING])
  expect((await readLinkRule(discord, moderator)).alert).toEqual({
    kind: "none",
  })
  expect(await auditReasons(discord)).toEqual([
    "aldis (1400000000000000001) : retrait du salon d’alerte « #journal »",
    "aldis (1400000000000000001) : choix du salon d’alerte « #journal »",
    "aldis (1400000000000000001) : choix du salon d’alerte « #alertes »",
  ])
})

test("the alert and the panel's action keep each other, whichever is written first: the alert comes after the block and the timeout, an action changed later keeps it, and the alert changed later keeps the action", async () => {
  const { discord, moderator } = await withTheLinkRule()

  await changeLinkRuleAction(discord, moderator, formOf("timeout-1h"))
  await changeAlertChannel(discord, moderator, form(ALERTS_ID))
  const alertedAfterAnHour = await actionsOf(discord)
  await changeLinkRuleAction(discord, moderator, formOf("block"))
  const blockedAfterAlert = await actionsOf(discord)
  await changeLinkRuleAction(discord, moderator, formOf("timeout-1h"))
  await changeAlertChannel(discord, moderator, form(JOURNAL_ID))
  const movedAfterAnHour = await actionsOf(discord)
  await changeAlertChannel(discord, moderator, form(""))
  const settings = await readLinkRule(discord, moderator)

  expect(alertedAfterAnHour).toEqual([
    ...TIMING_OUT_FOR_AN_HOUR,
    alertTo(ALERTS_ID),
  ])
  expect(blockedAfterAlert).toEqual([BLOCKING, alertTo(ALERTS_ID)])
  expect(movedAfterAnHour).toEqual([
    ...TIMING_OUT_FOR_AN_HOUR,
    alertTo(JOURNAL_ID),
  ])
  expect(await actionsOf(discord)).toEqual(TIMING_OUT_FOR_AN_HOUR)
  expect(settings.action).toBe("timeout-1h")
  expect(settings.alert).toEqual({ kind: "none" })
})

test("an alert that sits before the other actions, between them or after them is replaced and removed where it is, and every other action stays as Discord held it", async () => {
  const [blocking, timeout] = TIMING_OUT_FOR_AN_HOUR
  if (blocking === undefined || timeout === undefined) {
    throw new Error("The actions of the fixture are missing")
  }
  const arrangements = {
    before: (alert: APIAutoModerationAction) => [alert, blocking, timeout],
    between: (alert: APIAutoModerationAction) => [blocking, alert, timeout],
    after: (alert: APIAutoModerationAction) => [blocking, timeout, alert],
  }
  for (const [where, arranged] of Object.entries(arrangements)) {
    const { discord, moderator } = await withARuleActing(
      arranged(alertTo(ALERTS_ID))
    )

    await changeAlertChannel(discord, moderator, form(JOURNAL_ID))
    const replaced = await actionsOf(discord)
    await changeAlertChannel(discord, moderator, form(""))

    expect(replaced, where).toEqual(arranged(alertTo(JOURNAL_ID)))
    expect(await actionsOf(discord), where).toEqual([blocking, timeout])
  }
})

test("a write sends the actions alone: what the staff changed in Discord, the allowed domains, the exempt roles and channels, the name and whether the rule is enabled, stays", async () => {
  const { discord, moderator } = await withTheLinkRule()
  const [rule] = await discord.listAutoModerationRules()
  if (rule === undefined) {
    throw new Error("The link rule is missing")
  }
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, {
    exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID],
    exempt_channels: [GALLERY_ID],
    trigger_metadata: {
      ...rule.trigger_metadata,
      allow_list: [...(rule.trigger_metadata.allow_list ?? []), "*arte.tv"],
    },
    enabled: false,
  })
  const [before] = await discord.listAutoModerationRules()

  await changeAlertChannel(discord, moderator, form(ALERTS_ID))

  const [after] = await discord.listAutoModerationRules()
  expect(after).toEqual({
    ...before,
    actions: [BLOCKING, alertTo(ALERTS_ID)],
  })
  expect(after?.enabled).toBe(false)
})

test("every staff member may choose the alert channel, a moderation role being no part of it", async () => {
  const { discord, member } = await withTheLinkRule()

  const result = await changeAlertChannel(discord, member, form(ALERTS_ID))

  expect(result.ok).toBe(true)
  expect(await actionsOf(discord)).toEqual([BLOCKING, alertTo(ALERTS_ID)])
})

test("choosing the channel the rule alerts already, or none when it alerts none, succeeds and writes nothing", async () => {
  const { discord, moderator } = await withTheLinkRule()
  const none = await changeAlertChannel(discord, moderator, form(""))
  await changeAlertChannel(discord, moderator, form(ALERTS_ID))
  const reasonsBefore = await auditReasons(discord)
  const before = await discord.listAutoModerationRules()

  const same = await changeAlertChannel(discord, moderator, form(ALERTS_ID))

  expect(none).toEqual({
    ok: true,
    message: "La règle des liens n’a pas de salon d’alerte.",
  })
  expect(same).toEqual({
    ok: true,
    message: "« #alertes » est déjà le salon d’alerte de la règle des liens.",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect(await auditReasons(discord)).toEqual(reasonsBefore)
})

test("an alert to a channel that Discord no longer lists is removed all the same, named by its ID, and choosing it again writes nothing", async () => {
  const { discord, moderator } = await withARuleActing([
    BLOCKING,
    alertTo("1500000000000000999"),
  ])

  const same = await changeAlertChannel(
    discord,
    moderator,
    form("1500000000000000999")
  )
  const removed = await changeAlertChannel(discord, moderator, form(""))

  expect(same).toEqual({
    ok: true,
    message:
      "« 1500000000000000999 » est déjà le salon d’alerte de la règle des liens.",
  })
  expect(removed).toEqual({
    ok: true,
    message: "La règle des liens n’a plus de salon d’alerte.",
  })
  expect(await actionsOf(discord)).toEqual([BLOCKING])
  expect(await auditReasons(discord)).toEqual([
    "aldis (1400000000000000001) : retrait du salon d’alerte « 1500000000000000999 »",
  ])
})

test("with the rule missing, the choice is refused and the channel comes back as typed, a rule of another name being no link rule", async () => {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...newLinkRule(STAFF_ROLE_ID),
    name: "Liens bloqués du panel ",
  })
  const before = await discord.listAutoModerationRules()
  const moderator = await staffMemberOn(discord)

  const result = await changeAlertChannel(discord, moderator, form(ALERTS_ID))
  const removal = await changeAlertChannel(discord, moderator, form(""))

  expect(result).toEqual({
    ok: false,
    message: NO_RULE_MESSAGE,
    channel: ALERTS_ID,
  })
  expect(removal).toEqual({
    ok: false,
    message: NO_RULE_MESSAGE,
    channel: "",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("a channel that Discord does not list, or that is no text channel nor announcement channel, a category and a voice channel included, is refused in French with the channel as typed, and nothing is written", async () => {
  const { discord, moderator } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const reasonsBefore = await auditReasons(discord)

  const gone = await changeAlertChannel(
    discord,
    moderator,
    form("1500000000000000999")
  )
  const category = await changeAlertChannel(discord, moderator, form(GAMES_ID))
  const voice = await changeAlertChannel(discord, moderator, form(VOICE_ID))
  const forged = await changeAlertChannel(discord, moderator, form("salon"))

  expect(gone).toEqual({
    ok: false,
    message: GONE_MESSAGE,
    channel: "1500000000000000999",
  })
  expect(category).toEqual({
    ok: false,
    message: NOT_AN_ALERT_CHANNEL_MESSAGE,
    channel: GAMES_ID,
  })
  expect(voice).toEqual({
    ok: false,
    message: NOT_AN_ALERT_CHANNEL_MESSAGE,
    channel: VOICE_ID,
  })
  expect(forged).toMatchObject({ ok: false, channel: "salon" })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect(await auditReasons(discord)).toEqual(reasonsBefore)
})

test("an alert that the panel cannot write back whole, a second one, one with no channel or one that is the rule's only action, is set in Discord: the choice and the removal are refused, and every action stays as Discord held it", async () => {
  const arrangements = {
    "two alerts": [BLOCKING, alertTo(ALERTS_ID), alertTo(JOURNAL_ID)],
    "an alert with no channel": [
      BLOCKING,
      { type: AutoModerationActionType.SendAlertMessage },
    ],
    "an alert alone": [alertTo(ALERTS_ID)],
  }
  for (const [what, actions] of Object.entries(arrangements)) {
    const { discord, moderator } = await withARuleActing(actions)
    const before = await discord.listAutoModerationRules()

    const choice = await changeAlertChannel(
      discord,
      moderator,
      form(GALLERY_ID)
    )
    const removal = await changeAlertChannel(discord, moderator, form(""))

    expect(choice, what).toEqual({
      ok: false,
      message: SET_IN_DISCORD_MESSAGE,
      channel: GALLERY_ID,
    })
    expect(removal, what).toEqual({
      ok: false,
      message: SET_IN_DISCORD_MESSAGE,
      channel: "",
    })
    expect(await discord.listAutoModerationRules(), what).toEqual(before)
  }
})

test("when Discord does not answer the write, or the reads before it, the staff are told to reload and check, and the channel comes back as typed", async () => {
  const { discord, moderator } = await withTheLinkRule()
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await changeAlertChannel(discord, moderator, form(ALERTS_ID))
  discord.failNext(
    "listChannels",
    new DiscordError({ method: "GET", route: ROUTES.guildChannels })
  )

  const read = await changeAlertChannel(discord, moderator, form(ALERTS_ID))

  expect(write).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    channel: ALERTS_ID,
  })
  expect(read).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    channel: ALERTS_ID,
  })
  expect(await actionsOf(discord)).toEqual([BLOCKING])
})

test("a panel error is thrown, not returned", async () => {
  const { discord, moderator } = await withTheLinkRule()
  const missingPermissions = new DiscordError({
    method: "PATCH",
    route: ROUTES.autoModerationRule,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("modifyAutoModerationRule", missingPermissions)

  await expect(
    changeAlertChannel(discord, moderator, form(ALERTS_ID))
  ).rejects.toBe(missingPermissions)
})
