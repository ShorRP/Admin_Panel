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
import { addBlockedWord } from "./add-blocked-word"
import { BLOCKED_WORD_ACTIONS } from "./blocked-word-action"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

function discordWithStaff() {
  return new FakeDiscord({
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
    ],
  })
}

async function staffMemberOn(discord: FakeDiscord, user = ALDIS) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF_ROLE_ID,
      moderationRoleIds: [MODERATION_ROLE_ID],
      banRoleIds: [],
    },
    user.id
  )
  if (staffMember === null) {
    throw new Error(`${user.username} is no staff member`)
  }
  return staffMember
}

function moderatorOn(discord: FakeDiscord) {
  return staffMemberOn(discord, BRYN)
}

function form(word: string, action = "block") {
  const data = new FormData()
  data.set("word", word)
  data.set("action", action)
  return data
}

const BLOCK_ONLY = "Mots interdits du panel"

const ONE_HOUR = "Mots interdits du panel · exclusion 1 heure"

const ONE_DAY = "Mots interdits du panel · exclusion 1 jour"

test("the first word of an action creates that action's rule, which blocks the message", async () => {
  const discord = discordWithStaff()

  const result = await addBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo")
  )

  expect(result).toEqual({
    ok: true,
    message:
      "« foo » est maintenant un mot interdit, action « Bloquer seulement ».",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: BLOCK_ONLY,
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: { keyword_filter: ["foo"] },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
      exempt_roles: [],
      enabled: true,
    },
  ])
  const [rule] = await discord.listAutoModerationRules()
  expect(rule?.actions).toEqual([
    { type: AutoModerationActionType.BlockMessage },
  ])
})

test("the first word of an action that times out creates its rule, which blocks the message with a French notice, times the member out for the action's duration, and spares the staff role", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)

  const hour = await addBlockedWord(
    discord,
    moderator,
    form("foo", "timeout-1h")
  )
  const day = await addBlockedWord(
    discord,
    moderator,
    form("bar", "timeout-1d")
  )

  expect(hour).toEqual({
    ok: true,
    message:
      "« foo » est maintenant un mot interdit, action « Exclusion 1 heure ».",
  })
  expect(day.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: ONE_HOUR,
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: { keyword_filter: ["foo"] },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: {
            custom_message:
              "Message bloqué : il contient un mot interdit. Tu reçois une exclusion temporaire d’une heure du serveur Discord de Shor.",
          },
        },
        {
          type: AutoModerationActionType.Timeout,
          metadata: { duration_seconds: 3600 },
        },
      ],
      exempt_roles: [STAFF_ROLE_ID],
      enabled: true,
    },
    {
      name: ONE_DAY,
      trigger_metadata: { keyword_filter: ["bar"] },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: {
            custom_message:
              "Message bloqué : il contient un mot interdit. Tu reçois une exclusion temporaire d’un jour du serveur Discord de Shor.",
          },
        },
        {
          type: AutoModerationActionType.Timeout,
          metadata: { duration_seconds: 86400 },
        },
      ],
      exempt_roles: [STAFF_ROLE_ID],
    },
  ])
})

test("a later word joins the rule of its action, and the words of two actions sit in two rules", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("foo"))

  await addBlockedWord(discord, moderator, form("bar"))
  await addBlockedWord(discord, moderator, form("baz", "timeout-1h"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    { name: BLOCK_ONLY, trigger_metadata: { keyword_filter: ["foo", "bar"] } },
    { name: ONE_HOUR, trigger_metadata: { keyword_filter: ["baz"] } },
  ])
})

test("each blocked word added is recorded in the audit log, under the staff member's name and Discord ID, with its action", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)

  await addBlockedWord(discord, moderator, form("foo"))
  await addBlockedWord(discord, moderator, form("bar"))
  await addBlockedWord(discord, moderator, form("baz", "timeout-1d"))

  const { audit_log_entries } = await discord.getAuditLog({})
  expect(
    audit_log_entries.map(({ action_type, reason }) => ({
      action_type,
      reason,
    }))
  ).toEqual([
    {
      action_type: AuditLogEvent.AutoModerationRuleCreate,
      reason:
        "bryn (1400000000000000002) : ajout de « baz », action « Exclusion 1 jour »",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason:
        "bryn (1400000000000000002) : ajout de « bar », action « Bloquer seulement »",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleCreate,
      reason:
        "bryn (1400000000000000002) : ajout de « foo », action « Bloquer seulement »",
    },
  ])
})

function handMadeKeywordRule(name: string, keywords: string[]) {
  return {
    name,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: keywords },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: true,
  }
}

test("a keyword rule made by hand in Discord is never taken for the panel's", async () => {
  const discord = discordWithStaff()
  const handMade = discord.createAutoModerationRuleAs(
    ALDIS.id,
    handMadeKeywordRule("Liens", ["http"])
  )

  await addBlockedWord(discord, await staffMemberOn(discord), form("foo"))

  const rules = await discord.listAutoModerationRules()
  expect(rules).toHaveLength(2)
  expect(rules).toContainEqual(handMade)
  expect(rules).toContainEqual(
    expect.objectContaining({
      name: BLOCK_ONLY,
      trigger_metadata: { keyword_filter: ["foo"] },
    })
  )
})

test("a keyword rule given a rule's name by hand becomes the panel's, whatever its other settings", async () => {
  const discord = discordWithStaff()
  const handMade = discord.createAutoModerationRuleAs(
    ALDIS.id,
    handMadeKeywordRule(ONE_HOUR, ["http"])
  )

  await addBlockedWord(
    discord,
    await moderatorOn(discord),
    form("foo", "timeout-1h")
  )

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      id: handMade.id,
      trigger_metadata: { keyword_filter: ["http", "foo"] },
    },
  ])
})

test("a panel rule renamed in Discord is no longer the panel's, so the next word of its action creates another rule", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    name: "Mots interdits (ancien)",
  })

  await addBlockedWord(discord, staffMember, form("bar"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: "Mots interdits (ancien)",
      trigger_metadata: { keyword_filter: ["foo"] },
    },
    { name: BLOCK_ONLY, trigger_metadata: { keyword_filter: ["bar"] } },
  ])
})

test("adding a blocked word keeps what was changed by hand in its rule", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("foo", "timeout-1h"))
  const [rule] = await discord.listAutoModerationRules()
  const alert = {
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: "1500000000000000000" },
  }
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    trigger_metadata: {
      keyword_filter: ["foo"],
      regex_patterns: ["fo+"],
      allow_list: ["food"],
    },
    actions: [{ type: AutoModerationActionType.BlockMessage }, alert],
    exempt_roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID],
  })

  await addBlockedWord(discord, moderator, form("bar", "timeout-1h"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      trigger_metadata: {
        keyword_filter: ["foo", "bar"],
        regex_patterns: ["fo+"],
        allow_list: ["food"],
      },
      actions: [{ type: AutoModerationActionType.BlockMessage }, alert],
      exempt_roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID],
    },
  ])
})

test("a blocked word already there, whatever its case, is refused with the action it carries, and the word and the action come back as sent", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("merde", "timeout-1d"))

  const result = await addBlockedWord(discord, moderator, form("Merde"))

  expect(result).toEqual({
    ok: false,
    message: "« merde » est déjà un mot interdit, action « Exclusion 1 jour ».",
    word: "Merde",
    action: "block",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { name: ONE_DAY, trigger_metadata: { keyword_filter: ["merde"] } },
  ])
})

test("a blocked word that several rules hold, after a retouch in Discord, is refused with the strongest action", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("merde", "timeout-1h"))
  await addBlockedWord(discord, moderator, form("autre", "timeout-1d"))
  const [hour, day] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, day?.id ?? "", {
    trigger_metadata: { keyword_filter: ["MERDE"] },
  })
  discord.modifyAutoModerationRuleAs(ALDIS.id, hour?.id ?? "", {
    trigger_metadata: { keyword_filter: ["merde"] },
  })

  const result = await addBlockedWord(discord, moderator, form("Merde"))

  expect(result).toMatchObject({
    ok: false,
    message: "« MERDE » est déjà un mot interdit, action « Exclusion 1 jour ».",
  })
})

test("an action that is missing or unknown is refused, and the word and the action come back as sent", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const withoutAction = new FormData()
  withoutAction.set("word", "foo")

  expect(await addBlockedWord(discord, staffMember, withoutAction)).toEqual({
    ok: false,
    message: "Choisis une action.",
    word: "foo",
    action: "",
  })
  expect(
    await addBlockedWord(discord, staffMember, form("foo", "ban"))
  ).toEqual({
    ok: false,
    message: "Choisis une action.",
    word: "foo",
    action: "ban",
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a word and an action both refused give both messages", async () => {
  const discord = discordWithStaff()

  expect(
    await addBlockedWord(
      discord,
      await staffMemberOn(discord),
      form("  ", "nothing")
    )
  ).toEqual({
    ok: false,
    message: "Saisis un mot ou une expression. Choisis une action.",
    word: "  ",
    action: "nothing",
  })
})

test("a staff member who does not moderate cannot add a word that times out: the write throws, before anything is written", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  for (const { id } of BLOCKED_WORD_ACTIONS.filter(
    ({ right }) => right !== "staff"
  )) {
    await expect(
      addBlockedWord(discord, staffMember, form("foo", id))
    ).rejects.toThrow()
  }

  expect(await discord.listAutoModerationRules()).toEqual([])
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual([])
})

test("a staff member who moderates may add a word of each action", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)

  for (const { id } of BLOCKED_WORD_ACTIONS) {
    expect((await addBlockedWord(discord, moderator, form(id, id))).ok).toBe(
      true
    )
  }

  expect(await discord.listAutoModerationRules()).toHaveLength(
    BLOCKED_WORD_ACTIONS.length
  )
})

test("a blocked word holds up to 60 characters, accented ones included", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const longest = "é".repeat(60)

  const refused = await addBlockedWord(
    discord,
    staffMember,
    form(`${longest}é`)
  )
  const added = await addBlockedWord(discord, staffMember, form(longest))

  expect(refused).toEqual({
    ok: false,
    message: "Raccourcis ce mot : AutoMod n’accepte pas plus de 60 caractères.",
    word: `${longest}é`,
    action: "block",
  })
  expect(added.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: [longest] } },
  ])
})

test("an empty word, or one of spaces only, is refused", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  expect(await addBlockedWord(discord, staffMember, form(""))).toEqual({
    ok: false,
    message: "Saisis un mot ou une expression.",
    word: "",
    action: "block",
  })
  expect(await addBlockedWord(discord, staffMember, form("   "))).toEqual({
    ok: false,
    message: "Saisis un mot ou une expression.",
    word: "   ",
    action: "block",
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a form without a word as text is refused, and its word comes back empty", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const withFile = new FormData()
  withFile.set("word", new Blob(["foo"]), "word.txt")
  withFile.set("action", "block")

  for (const data of [form("", "block"), withFile]) {
    expect(await addBlockedWord(discord, staffMember, data)).toEqual({
      ok: false,
      message: "Saisis un mot ou une expression.",
      word: "",
      action: "block",
    })
  }
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("the spaces around a blocked word are dropped", async () => {
  const discord = discordWithStaff()

  const result = await addBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("  foo bar  ")
  )

  expect(result).toEqual({
    ok: true,
    message:
      "« foo bar » est maintenant un mot interdit, action « Bloquer seulement ».",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo bar"] } },
  ])
})

function fullRuleOn(discord: FakeDiscord, action: string) {
  return async () => {
    const moderator = await moderatorOn(discord)
    await addBlockedWord(discord, moderator, form("mot0", action))
    const rule = (await discord.listAutoModerationRules()).at(-1)
    const full = Array.from({ length: 1000 }, (_, index) => `mot${index}`)
    discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
      trigger_metadata: { keyword_filter: full },
    })
    return { moderator, full }
  }
}

test("a rule holds up to 1,000 blocked words, and a full rule refuses its action alone", async () => {
  const discord = discordWithStaff()
  const { moderator, full } = await fullRuleOn(discord, "timeout-1h")()

  const refused = await addBlockedWord(
    discord,
    moderator,
    form("encore", "timeout-1h")
  )
  const otherAction = await addBlockedWord(
    discord,
    moderator,
    form("encore", "timeout-1d")
  )

  expect(refused).toEqual({
    ok: false,
    message:
      "La règle « Exclusion 1 heure » compte déjà 1 000 mots interdits, le maximum d’AutoMod. Retires-en un, ou choisis une autre action.",
    word: "encore",
    action: "timeout-1h",
  })
  expect(otherAction.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { name: ONE_HOUR, trigger_metadata: { keyword_filter: full } },
    { name: ONE_DAY, trigger_metadata: { keyword_filter: ["encore"] } },
  ])
})

test("with 6 keyword rules on the Discord server already, only the action whose rule does not exist yet is refused", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("foo", "timeout-1d"))
  for (let index = 1; index <= 5; index++) {
    discord.createAutoModerationRuleAs(
      ALDIS.id,
      handMadeKeywordRule(`Règle ${index}`, [`mot${index}`])
    )
  }

  const refused = await addBlockedWord(
    discord,
    moderator,
    form("bar", "timeout-1h")
  )
  const accepted = await addBlockedWord(
    discord,
    moderator,
    form("baz", "timeout-1d")
  )

  expect(refused).toEqual({
    ok: false,
    message:
      "Le serveur Discord a déjà 6 règles AutoMod de mots-clés : le panel ne peut pas y créer la règle « Exclusion 1 heure ». Supprimes-en une dans Discord, ou choisis une autre action.",
    word: "bar",
    action: "timeout-1h",
  })
  expect(accepted.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toHaveLength(6)
})

test("AutoMod rules of other kinds leave room for the panel's rules", async () => {
  const discord = discordWithStaff()
  for (let index = 1; index <= 5; index++) {
    discord.createAutoModerationRuleAs(
      ALDIS.id,
      handMadeKeywordRule(`Règle ${index}`, [`mot${index}`])
    )
  }
  discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Mentions",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.MentionSpam,
    trigger_metadata: { mention_total_limit: 5 },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })

  const result = await addBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo")
  )

  expect(result.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toHaveLength(7)
})

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

test("when Discord does not answer the write, the staff are told to reload and check, and the word and the action come back", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )

  const result = await addBlockedWord(discord, staffMember, form(" bar"))

  expect(result).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    word: " bar",
    action: "block",
  })
})

test("when Discord does not answer the read before the write, the staff get the same message", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const result = await addBlockedWord(discord, staffMember, form("foo"))

  expect(result).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    word: "foo",
    action: "block",
  })
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

  await expect(addBlockedWord(discord, staffMember, form("foo"))).rejects.toBe(
    missingPermissions
  )
})
