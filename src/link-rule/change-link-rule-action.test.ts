import {
  AuditLogEvent,
  AutoModerationActionType,
  RESTJSONErrorCodes,
  type APIAutoModerationAction,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { changeLinkRuleAction } from "./change-link-rule-action"
import { newLinkRule } from "./link-rule"
import { readLinkRule } from "./read-link-rule"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATOR_ROLE_ID = "1300000000000000011"

const GUARD_ROLE_ID = "1300000000000000010"

const ALERT_CHANNEL_ID = "1500000000000000009"

const GALLERY_ID = "1500000000000000001"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const BLOCK_NOTICE =
  "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor."

const HOUR_NOTICE = `${BLOCK_NOTICE} Tu reçois une exclusion temporaire d’une heure.`

const DAY_NOTICE = `${BLOCK_NOTICE} Tu reçois une exclusion temporaire d’un jour.`

const BLOCKING = {
  type: AutoModerationActionType.BlockMessage,
  metadata: { custom_message: BLOCK_NOTICE },
}

const TIMING_OUT_FOR_AN_HOUR = [
  {
    type: AutoModerationActionType.BlockMessage,
    metadata: { custom_message: HOUR_NOTICE },
  },
  {
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: 3600 },
  },
]

const TIMING_OUT_FOR_A_DAY = [
  {
    type: AutoModerationActionType.BlockMessage,
    metadata: { custom_message: DAY_NOTICE },
  },
  {
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: 86400 },
  },
]

const ALERTING = {
  type: AutoModerationActionType.SendAlertMessage,
  metadata: { channel_id: ALERT_CHANNEL_ID },
}

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

function form(action: string) {
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
    member: await staffMemberOn(discord, BRYN),
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

test("a moderator gives the rule each of its three actions in turn, which the rule read back holds with its notice and its duration, and the audit log names the old action and the new one", async () => {
  const { discord, moderator } = await withTheLinkRule()
  expect(await actionsOf(discord)).toEqual([BLOCKING])

  const hour = await changeLinkRuleAction(
    discord,
    moderator,
    form("timeout-1h")
  )
  const afterAnHour = await actionsOf(discord)
  const day = await changeLinkRuleAction(discord, moderator, form("timeout-1d"))
  const afterADay = await actionsOf(discord)
  const read = await readLinkRule(discord, moderator)
  const block = await changeLinkRuleAction(discord, moderator, form("block"))

  expect(hour).toEqual({
    ok: true,
    message: "La règle des liens passe à « Exclusion 1 heure ».",
  })
  expect(afterAnHour).toEqual(TIMING_OUT_FOR_AN_HOUR)
  expect(day).toEqual({
    ok: true,
    message: "La règle des liens passe à « Exclusion 1 jour ».",
  })
  expect(afterADay).toEqual(TIMING_OUT_FOR_A_DAY)
  expect(read.action).toBe("timeout-1d")
  expect(block).toEqual({
    ok: true,
    message: "La règle des liens passe à « Bloquer seulement ».",
  })
  expect(await actionsOf(discord)).toEqual([BLOCKING])
  expect(await auditReasons(discord)).toEqual([
    "aldis (1400000000000000001) : changement de l’action de la règle des liens, de « Exclusion 1 jour » à « Bloquer seulement »",
    "aldis (1400000000000000001) : changement de l’action de la règle des liens, de « Exclusion 1 heure » à « Exclusion 1 jour »",
    "aldis (1400000000000000001) : changement de l’action de la règle des liens, de « Bloquer seulement » à « Exclusion 1 heure »",
  ])
})

test("a SEND_ALERT_MESSAGE action, wherever it sits among the actions, comes out of every change of action exactly as Discord held it, and the action the page reads stays the one asked for", async () => {
  const arrangements = {
    "after the others": (own: APIAutoModerationAction[]) => [...own, ALERTING],
    "before the others": (own: APIAutoModerationAction[]) => [ALERTING, ...own],
    "between the blocking and the timeout": ([
      blocking,
      ...rest
    ]: APIAutoModerationAction[]) => [blocking, ALERTING, ...rest],
  }
  const ownActions = {
    block: [BLOCKING],
    "timeout-1h": TIMING_OUT_FOR_AN_HOUR,
    "timeout-1d": TIMING_OUT_FOR_A_DAY,
  } as const
  for (const [where, arranged] of Object.entries(arrangements)) {
    const { discord, moderator } = await withARuleActing(
      arranged(TIMING_OUT_FOR_AN_HOUR)
    )
    for (const to of [
      "timeout-1d",
      "block",
      "timeout-1h",
      "block",
      "timeout-1d",
    ] as const) {
      const result = await changeLinkRuleAction(discord, moderator, form(to))

      const actions = (await actionsOf(discord)) ?? []
      expect(result.ok, `${where}, to ${to}`).toBe(true)
      expect(
        actions.filter(
          ({ type }) => type === AutoModerationActionType.SendAlertMessage
        ),
        `${where}, to ${to}`
      ).toEqual([ALERTING])
      expect(
        actions.filter(
          ({ type }) => type !== AutoModerationActionType.SendAlertMessage
        ),
        `${where}, to ${to}`
      ).toEqual(ownActions[to])
      expect((await readLinkRule(discord, moderator)).action).toBe(to)
    }
  }
})

test("an action of the rule that is neither the panel's nor an alert, left by a change made in Discord, makes the action the panel's no more: the change is refused, and every action stays as Discord held it", async () => {
  const foreign = {
    type: AutoModerationActionType.BlockMemberInteraction,
  }
  const { discord, moderator } = await withARuleActing([
    BLOCKING,
    ALERTING,
    foreign,
  ])
  const before = await discord.listAutoModerationRules()

  const result = await changeLinkRuleAction(
    discord,
    moderator,
    form("timeout-1h")
  )

  expect(result).toEqual({
    ok: false,
    message:
      "L’action de la règle des liens n’est pas l’une de celles du panel : elle se change dans Discord.",
    action: "timeout-1h",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect(await actionsOf(discord)).toEqual([BLOCKING, ALERTING, foreign])
})

test("a timeout that is neither of an hour nor of a day, set in Discord, is not an action of the panel, and the change is refused with nothing written", async () => {
  const { discord, moderator } = await withARuleActing([
    BLOCKING,
    {
      type: AutoModerationActionType.Timeout,
      metadata: { duration_seconds: 600 },
    },
  ])
  const before = await discord.listAutoModerationRules()

  const result = await changeLinkRuleAction(discord, moderator, form("block"))

  expect(result).toMatchObject({
    ok: false,
    message:
      "L’action de la règle des liens n’est pas l’une de celles du panel : elle se change dans Discord.",
    action: "block",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("a change sends the actions alone: what the staff changed in Discord, the allowed domains, the exempt roles and channels, the name and whether the rule is enabled, stays", async () => {
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

  await changeLinkRuleAction(discord, moderator, form("timeout-1h"))

  const [after] = await discord.listAutoModerationRules()
  expect(after).toEqual({ ...before, actions: TIMING_OUT_FOR_AN_HOUR })
  expect(after?.enabled).toBe(false)
})

test("choosing the action the rule has succeeds and writes nothing, and the notice that the staff wrote in Discord stays", async () => {
  const { discord, moderator } = await withTheLinkRule()
  await changeLinkRuleAction(discord, moderator, form("timeout-1h"))
  const [rule] = await discord.listAutoModerationRules()
  if (rule === undefined) {
    throw new Error("The link rule is missing")
  }
  const reworded = [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: "Pas de lien ici." },
    },
    TIMING_OUT_FOR_AN_HOUR[1] ?? ALERTING,
  ]
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { actions: reworded })
  const reasonsBefore = await auditReasons(discord)

  const result = await changeLinkRuleAction(
    discord,
    moderator,
    form("timeout-1h")
  )

  expect(result).toEqual({
    ok: true,
    message: "La règle des liens a déjà l’action « Exclusion 1 heure ».",
  })
  expect(await actionsOf(discord)).toEqual(reworded)
  expect((await auditReasons(discord)).length).toBe(reasonsBefore.length)
})

test("a staff member who holds no moderation role cannot choose an exclusion: the write throws, and nothing is written", async () => {
  const { discord, member } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const reasonsBefore = await auditReasons(discord)

  await expect(
    changeLinkRuleAction(discord, member, form("timeout-1h"))
  ).rejects.toThrow()
  await expect(
    changeLinkRuleAction(discord, member, form("timeout-1d"))
  ).rejects.toThrow()

  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect(await auditReasons(discord)).toEqual(reasonsBefore)
})

test("the right to an exclusion is checked before the rules are read: a staff member who holds no moderation role gets a throw, not a refusal, when the rule is missing", async () => {
  const discord = discordWithStaff()

  await expect(
    changeLinkRuleAction(
      discord,
      await staffMemberOn(discord, BRYN),
      form("timeout-1h")
    )
  ).rejects.toThrow()
})

test("a staff member who holds no moderation role cannot leave the exclusion that the rule has, and the rule keeps it", async () => {
  const { discord, member } = await withARuleActing([...TIMING_OUT_FOR_A_DAY])
  const before = await discord.listAutoModerationRules()

  await expect(
    changeLinkRuleAction(discord, member, form("block"))
  ).rejects.toThrow()

  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect(await actionsOf(discord)).toEqual(TIMING_OUT_FOR_A_DAY)
})

test("a staff member who holds no moderation role who chooses « Bloquer seulement » on a rule that only blocks succeeds and writes nothing", async () => {
  const { discord, member } = await withTheLinkRule()

  const result = await changeLinkRuleAction(discord, member, form("block"))

  expect(result).toEqual({
    ok: true,
    message: "La règle des liens a déjà l’action « Bloquer seulement ».",
  })
  expect(await auditReasons(discord)).toEqual([])
})

test("with the rule missing, the change is refused and the action comes back as typed, a rule of another name being no link rule", async () => {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...newLinkRule(STAFF_ROLE_ID),
    name: "Liens bloqués du panel ",
  })
  const before = await discord.listAutoModerationRules()

  const result = await changeLinkRuleAction(
    discord,
    await staffMemberOn(discord),
    form("timeout-1d")
  )

  expect(result).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis change l’action.",
    action: "timeout-1d",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("no action, an empty one or one the panel does not know is refused in French with the action as typed, and nothing is written", async () => {
  const { discord, moderator } = await withTheLinkRule()
  const before = await discord.listAutoModerationRules()
  const reasonsBefore = await auditReasons(discord)

  const none = await changeLinkRuleAction(discord, moderator, new FormData())
  const empty = await changeLinkRuleAction(discord, moderator, form(""))
  const kick = await changeLinkRuleAction(discord, moderator, form("kick"))
  const ban = await changeLinkRuleAction(discord, moderator, form("ban"))

  expect(none).toEqual({
    ok: false,
    message: "Choisis une action.",
    action: "",
  })
  expect(empty).toEqual({
    ok: false,
    message: "Choisis une action.",
    action: "",
  })
  expect(kick).toEqual({
    ok: false,
    message: "Choisis une action.",
    action: "kick",
  })
  expect(ban).toEqual({
    ok: false,
    message: "Choisis une action.",
    action: "ban",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect(await auditReasons(discord)).toEqual(reasonsBefore)
})

test("when Discord does not answer the write, or the read before it, the staff are told to reload and check, and the action comes back as typed", async () => {
  const { discord, moderator } = await withTheLinkRule()
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await changeLinkRuleAction(
    discord,
    moderator,
    form("timeout-1h")
  )
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const read = await changeLinkRuleAction(
    discord,
    moderator,
    form("timeout-1h")
  )

  expect(write).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    action: "timeout-1h",
  })
  expect(read).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    action: "timeout-1h",
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
    changeLinkRuleAction(discord, moderator, form("timeout-1h"))
  ).rejects.toBe(missingPermissions)
})
