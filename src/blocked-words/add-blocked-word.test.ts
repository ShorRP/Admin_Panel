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

const STAFF_ROLE_ID = "1300000000000000000"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

function discordWithStaff() {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
}

async function staffMemberOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)
  if (staffMember === null) {
    throw new Error("Aldis is no staff member")
  }
  return staffMember
}

function form(word: string) {
  const data = new FormData()
  data.set("word", word)
  return data
}

test("the first blocked word creates the panel's keyword rule, which blocks the message", async () => {
  const discord = discordWithStaff()

  const result = await addBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » est maintenant un mot interdit.",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: "Mots interdits du panel",
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: { keyword_filter: ["foo"] },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
      enabled: true,
    },
  ])
})

test("a later blocked word joins the panel's rule", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))

  await addBlockedWord(discord, staffMember, form("bar"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo", "bar"] } },
  ])
})

test("each blocked word added is recorded in the audit log, under the staff member's name and Discord ID", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  await addBlockedWord(discord, staffMember, form("foo"))
  await addBlockedWord(discord, staffMember, form("bar"))

  const { audit_log_entries } = await discord.getAuditLog({})
  expect(
    audit_log_entries.map(({ action_type, reason }) => ({
      action_type,
      reason,
    }))
  ).toEqual([
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: "aldis (1400000000000000001) : ajout de « bar »",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleCreate,
      reason: "aldis (1400000000000000001) : ajout de « foo »",
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
      name: "Mots interdits du panel",
      trigger_metadata: { keyword_filter: ["foo"] },
    })
  )
})

test("adding a blocked word keeps what was changed by hand in the panel's rule", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
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
  })

  await addBlockedWord(discord, staffMember, form("bar"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      trigger_metadata: {
        keyword_filter: ["foo", "bar"],
        regex_patterns: ["fo+"],
        allow_list: ["food"],
      },
      actions: [{ type: AutoModerationActionType.BlockMessage }, alert],
    },
  ])
})

test("a blocked word already there, whatever its case, is refused, and the word comes back as typed", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("merde"))

  const result = await addBlockedWord(discord, staffMember, form("Merde"))

  expect(result).toEqual({
    ok: false,
    message: "« merde » est déjà un mot interdit.",
    word: "Merde",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["merde"] } },
  ])
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
  })
  expect(await addBlockedWord(discord, staffMember, form("   "))).toEqual({
    ok: false,
    message: "Saisis un mot ou une expression.",
    word: "   ",
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a form without a word as text is refused, and its word comes back empty", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const withFile = new FormData()
  withFile.set("word", new Blob(["foo"]), "word.txt")

  for (const data of [new FormData(), withFile]) {
    expect(await addBlockedWord(discord, staffMember, data)).toEqual({
      ok: false,
      message: "Saisis un mot ou une expression.",
      word: "",
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
    message: "« foo bar » est maintenant un mot interdit.",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo bar"] } },
  ])
})

test("the panel's rule holds up to 1,000 blocked words", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("mot0"))
  const [rule] = await discord.listAutoModerationRules()
  const full = Array.from({ length: 1000 }, (_, index) => `mot${index}`)
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    trigger_metadata: { keyword_filter: full },
  })

  const result = await addBlockedWord(discord, staffMember, form("encore"))

  expect(result).toEqual({
    ok: false,
    message:
      "La règle du panel compte déjà 1 000 mots interdits, le maximum d’AutoMod. Retires-en un pour en ajouter un autre.",
    word: "encore",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: full } },
  ])
})

test("with 6 keyword rules on the Discord server already, the panel's rule cannot be created", async () => {
  const discord = discordWithStaff()
  for (let index = 1; index <= 6; index++) {
    discord.createAutoModerationRuleAs(
      ALDIS.id,
      handMadeKeywordRule(`Règle ${index}`, [`mot${index}`])
    )
  }

  const result = await addBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo")
  )

  expect(result).toEqual({
    ok: false,
    message:
      "Le serveur a déjà 6 règles AutoMod de mots-clés. Supprimes-en une dans Discord pour que le panel crée la sienne.",
    word: "foo",
  })
  expect(await discord.listAutoModerationRules()).toHaveLength(6)
})

test("AutoMod rules of other kinds leave room for the panel's rule", async () => {
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

test("when Discord does not answer the write, the staff are told to reload and check, and the word comes back", async () => {
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
