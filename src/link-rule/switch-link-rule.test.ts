import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { readLinkRule } from "./read-link-rule"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GUARD_ROLE_ID = "1300000000000000010"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

function discordWithStaff() {
  return new FakeDiscord({
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: GUARD_ROLE_ID, name: "Garde" },
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

function form(enabled: string) {
  const data = new FormData()
  data.set("enabled", enabled)
  return data
}

function handMadeKeywordRule(name: string) {
  return {
    name,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["mot"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  }
}

const NO_ROOM_REFUSAL =
  "Le serveur Discord a déjà 6 règles AutoMod de mots-clés : le panel ne peut pas y créer la règle « Liens bloqués du panel ». Supprimes-en une dans Discord, puis réessaie."

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

test("the first « Activer » creates the link rule, enabled, which blocks a link up to its host and an invite with no scheme, with the notice of the blocked link, the staff role exempted and the eight default domains allowed", async () => {
  const discord = discordWithStaff()

  const result = await switchLinkRule(
    discord,
    await staffMemberOn(discord),
    form("true")
  )

  expect(result).toEqual({
    ok: true,
    message: "La règle des liens est créée et active.",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: "Liens bloqués du panel",
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: {
        regex_patterns: [
          "https?://[^\\s/?#]+",
          "(?:discord\\.gg|discord(?:app)?\\.com/invite)/\\S+",
        ],
      },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: {
            custom_message:
              "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor.",
          },
        },
      ],
      exempt_roles: [STAFF_ROLE_ID],
      exempt_channels: [],
      enabled: true,
    },
  ])
  const [rule] = await discord.listAutoModerationRules()
  expect(rule?.actions).toHaveLength(1)
  expect(rule?.trigger_metadata.allow_list).toHaveLength(32)
  expect(rule?.trigger_metadata.allow_list).toEqual(
    expect.arrayContaining([
      "https://youtube.com",
      "https://youtube.com/*",
      "https://www.youtube.com",
      "https://www.youtube.com/*",
      "https://media.discordapp.net/*",
    ])
  )
})

test("« Couper » turns the rule off and « Activer » turns it back on, the rule read back keeping its domains, roles and channels in between", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await switchLinkRule(discord, staffMember, form("true"))
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, created?.id ?? "", {
    exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID],
    exempt_channels: ["1500000000000000001"],
    trigger_metadata: {
      ...created?.trigger_metadata,
      allow_list: [
        ...(created?.trigger_metadata.allow_list ?? []),
        "https://x",
      ],
    },
  })
  const before = await discord.listAutoModerationRules()

  const off = await switchLinkRule(discord, staffMember, form("false"))
  const [disabled] = await discord.listAutoModerationRules()
  const on = await switchLinkRule(discord, staffMember, form("true"))
  const [enabled] = await discord.listAutoModerationRules()

  expect(off).toEqual({
    ok: true,
    message: "La règle des liens est coupée. Ses réglages sont gardés.",
  })
  expect(disabled).toEqual({ ...before[0], enabled: false })
  expect(on).toEqual({ ok: true, message: "La règle des liens est active." })
  expect(enabled).toEqual({ ...before[0], enabled: true })
  expect(await discord.listAutoModerationRules()).toHaveLength(1)
})

test("what the staff changed in Discord stays through a switch, which writes the rule's enabled alone", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await switchLinkRule(discord, staffMember, form("true"))
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, created?.id ?? "", {
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
    exempt_roles: [GUARD_ROLE_ID],
  })

  await switchLinkRule(discord, staffMember, form("false"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      enabled: false,
      exempt_roles: [GUARD_ROLE_ID],
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
    },
  ])
})

test("each switch is recorded in the audit log under the staff member's name and Discord ID, with what it did", async () => {
  const discord = discordWithStaff()
  const aldis = await staffMemberOn(discord)
  const bryn = await staffMemberOn(discord, BRYN)

  await switchLinkRule(discord, aldis, form("true"))
  await switchLinkRule(discord, bryn, form("false"))
  await switchLinkRule(discord, aldis, form("true"))

  const { audit_log_entries } = await discord.getAuditLog({})
  expect(
    audit_log_entries.map(({ action_type, reason }) => ({
      action_type,
      reason,
    }))
  ).toEqual([
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: "aldis (1400000000000000001) : activation de la règle des liens",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: "bryn (1400000000000000002) : coupure de la règle des liens",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleCreate,
      reason:
        "aldis (1400000000000000001) : création et activation de la règle des liens",
    },
  ])
})

test("a switch to the state the rule already has succeeds and writes nothing", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const absent = await switchLinkRule(discord, staffMember, form("false"))
  await switchLinkRule(discord, staffMember, form("true"))
  const enabled = await switchLinkRule(discord, staffMember, form("true"))
  await switchLinkRule(discord, staffMember, form("false"))
  const disabled = await switchLinkRule(discord, staffMember, form("false"))

  expect(absent).toEqual({
    ok: true,
    message: "La règle des liens n’existe pas encore : il n’y a rien à couper.",
  })
  expect(enabled).toEqual({
    ok: true,
    message: "La règle des liens est déjà active.",
  })
  expect(disabled).toEqual({
    ok: true,
    message: "La règle des liens est déjà coupée.",
  })
  expect((await discord.getAuditLog({})).audit_log_entries).toHaveLength(2)
})

test("a rule that does not carry exactly the link rule's name is not the link rule: « Activer » creates the rule beside it and leaves it as it was", async () => {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    handMadeKeywordRule("Liens bloqués du panel (ancienne)")
  )
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    handMadeKeywordRule("liens bloqués du panel")
  )
  const [handMade, lowerCase] = await discord.listAutoModerationRules()

  await switchLinkRule(discord, await staffMemberOn(discord), form("true"))

  const rules = await discord.listAutoModerationRules()
  expect(rules).toHaveLength(3)
  expect(rules.slice(0, 2)).toEqual([handMade, lowerCase])
  expect(rules[2]?.name).toBe("Liens bloqués du panel")
  expect(
    (await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })).status
  ).toBe("enabled")
})

test("with 6 keyword rules on the Discord server already, the creation is refused in the panel's own message and creates nothing, while the existing rule still switches", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 6; index++) {
    discord.createAutoModerationRuleAs(
      ALDIS.id,
      handMadeKeywordRule(`Règle ${index}`)
    )
  }

  const refused = await switchLinkRule(discord, staffMember, form("true"))

  expect(refused).toEqual({ ok: false, message: NO_ROOM_REFUSAL })
  expect(await discord.listAutoModerationRules()).toHaveLength(6)
  expect((await discord.getAuditLog({})).audit_log_entries).toHaveLength(6)
})

test("with 6 keyword rules among which the link rule is, the rule switches", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await switchLinkRule(discord, staffMember, form("true"))
  for (let index = 1; index <= 5; index++) {
    discord.createAutoModerationRuleAs(
      ALDIS.id,
      handMadeKeywordRule(`Règle ${index}`)
    )
  }

  const off = await switchLinkRule(discord, staffMember, form("false"))

  expect(off.ok).toBe(true)
})

test("rules of other kinds leave room for the link rule", async () => {
  const discord = discordWithStaff()
  for (let index = 1; index <= 5; index++) {
    discord.createAutoModerationRuleAs(
      ALDIS.id,
      handMadeKeywordRule(`Règle ${index}`)
    )
  }
  discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Mentions",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.MentionSpam,
    trigger_metadata: { mention_total_limit: 5 },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })

  const result = await switchLinkRule(
    discord,
    await staffMemberOn(discord),
    form("true")
  )

  expect(result.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toHaveLength(7)
})

test("a form that says neither « true » nor « false » is refused, and nothing is written", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const result = await switchLinkRule(discord, staffMember, form("maybe"))
  const absent = await switchLinkRule(discord, staffMember, new FormData())

  expect(result).toEqual({
    ok: false,
    message: "Choisis d’activer ou de couper la règle des liens.",
  })
  expect(absent.ok).toBe(false)
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the read before it, the staff are told to reload and check", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  discord.failNext(
    "createAutoModerationRule",
    new DiscordError({
      method: "POST",
      route: ROUTES.autoModerationRules,
      status: 503,
    })
  )
  const write = await switchLinkRule(discord, staffMember, form("true"))
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const read = await switchLinkRule(discord, staffMember, form("true"))

  expect(write).toEqual({ ok: false, message: DISCORD_UNAVAILABLE })
  expect(read).toEqual({ ok: false, message: DISCORD_UNAVAILABLE })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a panel error is thrown, not returned", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const missingPermissions = new DiscordError({
    method: "POST",
    route: ROUTES.autoModerationRules,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("createAutoModerationRule", missingPermissions)

  await expect(switchLinkRule(discord, staffMember, form("true"))).rejects.toBe(
    missingPermissions
  )
})
