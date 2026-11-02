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
import { blockedWordAction } from "./blocked-word-action"
import { changeActionOfBlockedWord } from "./change-action-of-blocked-word"
import { frenchNumber } from "./french-text"
import { newPanelRule } from "./panel-rule"
import { readBlockedWords } from "./read-blocked-words"
import { removeBlockedWord } from "./remove-blocked-word"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const BLOCK_ONLY = "Mots interdits du panel"

const ONE_HOUR = "Mots interdits du panel · exclusion 1 heure"

const ONE_DAY = "Mots interdits du panel · exclusion 1 jour"

class FakeDiscordFailingLaterModify extends FakeDiscord {
  private modifiesBeforeFailure: number | null = null

  failModifyAfter(modifies: number) {
    this.modifiesBeforeFailure = modifies
  }

  override modifyAutoModerationRule(
    ...call: Parameters<FakeDiscord["modifyAutoModerationRule"]>
  ) {
    if (this.modifiesBeforeFailure === 0) {
      this.modifiesBeforeFailure = null
      return Promise.reject(unavailable())
    }
    if (this.modifiesBeforeFailure !== null) {
      this.modifiesBeforeFailure--
    }
    return super.modifyAutoModerationRule(...call)
  }
}

function unavailable() {
  return new DiscordError({
    method: "PATCH",
    route: ROUTES.autoModerationRule,
    status: 503,
  })
}

function discordWithStaff() {
  return new FakeDiscordFailingLaterModify({
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

function addition(word: string, action = "block") {
  const data = new FormData()
  data.set("word", word)
  data.set("action", action)
  return data
}

function change(word: string, action: string) {
  const data = addition(word, action)
  data.set("change", "action")
  return data
}

async function keywordsByRule(discord: FakeDiscord) {
  return Object.fromEntries(
    (await discord.listAutoModerationRules()).map((rule) => [
      rule.name,
      rule.trigger_metadata.keyword_filter ?? [],
    ])
  )
}

async function newestEntries(discord: FakeDiscord, count: number) {
  const { audit_log_entries } = await discord.getAuditLog({ limit: count })
  return audit_log_entries
}

async function entryCount(discord: FakeDiscord) {
  return (await discord.getAuditLog({})).audit_log_entries.length
}

const NO_BREAK_SPACE = String.fromCharCode(0xa0)

function reasonOf(change: string) {
  return `bryn (${BRYN.id})${NO_BREAK_SPACE}: ${change}`
}

const BLOCK_TO_DAY =
  "« foo » passe de « Bloquer seulement » à « Exclusion 1 jour »"

async function discordHoldingFooTwiceAfterAnInterruptedChange() {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  await addBlockedWord(discord, moderator, addition("bar", "timeout-1d"))
  discord.failModifyAfter(1)
  const interrupted = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )
  return { discord, moderator, interrupted }
}

test("a word moves to the rule of its new action, which the panel creates with that word alone, sparing the staff role and warning the member, and leaves its old rule, which keeps the other words", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  await addBlockedWord(discord, moderator, addition("bar"))

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » passe à « Exclusion 1 jour ».",
  })
  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: ["bar"],
    [ONE_DAY]: ["foo"],
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    {},
    newPanelRule(blockedWordAction("timeout-1d"), STAFF_ROLE_ID, ["foo"]),
  ])
  expect(await readBlockedWords(discord)).toMatchObject({
    words: [
      { word: "bar", action: "block" },
      { word: "foo", action: "timeout-1d" },
    ],
  })
})

test("a word moves to a rule that exists already, after the words it holds, and leaves the rule it was in", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  await addBlockedWord(discord, moderator, addition("cerise", "timeout-1h"))
  await addBlockedWord(discord, moderator, addition("abricot", "timeout-1h"))

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1h")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » passe à « Exclusion 1 heure ».",
  })
  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: [],
    [ONE_HOUR]: ["cerise", "abricot", "foo"],
  })
})

test("a word given a weaker action leaves the stronger rule for the weaker one", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo", "timeout-1d"))
  await addBlockedWord(discord, moderator, addition("bar"))

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "block")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » passe à « Bloquer seulement ».",
  })
  expect(await keywordsByRule(discord)).toEqual({
    [ONE_DAY]: [],
    [BLOCK_ONLY]: ["bar", "foo"],
  })
})

test("both writes carry the same reason, which names the staff member, the word and the two actions, the new rule's coming first", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  const [oldRule] = await discord.listAutoModerationRules()

  await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  const [leaving, entering] = await newestEntries(discord, 2)
  const newRule = (await discord.listAutoModerationRules()).at(-1)
  expect(entering).toMatchObject({
    action_type: AuditLogEvent.AutoModerationRuleCreate,
    target_id: newRule?.id,
    reason: reasonOf(BLOCK_TO_DAY),
  })
  expect(leaving).toMatchObject({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
    target_id: oldRule?.id,
    reason: reasonOf(BLOCK_TO_DAY),
  })
})

test("a word enters its new rule before it leaves the old one: when Discord does not answer the second write, the word is in both rules, and the result says so, naming both actions, and that the word stays blocked", async () => {
  const { discord, interrupted } =
    await discordHoldingFooTwiceAfterAnInterruptedChange()

  expect(interrupted).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : « foo » est peut-être dans deux règles, « Bloquer seulement » et « Exclusion 1 jour ». Il reste bloqué. Recharge la page, puis change à nouveau son action ou retire-le.",
    word: "foo",
    action: "timeout-1d",
  })
  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: ["foo"],
    [ONE_DAY]: ["bar", "foo"],
  })
  expect(await readBlockedWords(discord)).toMatchObject({
    words: [
      { word: "bar", action: "timeout-1d" },
      { word: "foo", action: "timeout-1d" },
    ],
  })
  expect(
    (await newestEntries(discord, 1)).map(({ action_type, reason }) => ({
      action_type,
      reason,
    }))
  ).toEqual([
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: reasonOf(BLOCK_TO_DAY),
    },
  ])
})

test("the next change of a word that two rules hold leaves it in the rule of its new action alone", async () => {
  const { discord, moderator } =
    await discordHoldingFooTwiceAfterAnInterruptedChange()

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1h")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » passe à « Exclusion 1 heure ».",
  })
  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: [],
    [ONE_DAY]: ["bar"],
    [ONE_HOUR]: ["foo"],
  })
  const [first, second, third] = await newestEntries(discord, 3)
  expect([first?.reason, second?.reason, third?.reason]).toEqual([
    reasonOf("« foo » passe de « Exclusion 1 jour » à « Exclusion 1 heure »"),
    reasonOf("« foo » passe de « Bloquer seulement » à « Exclusion 1 heure »"),
    reasonOf("« foo » passe de « Exclusion 1 jour » à « Exclusion 1 heure »"),
  ])
})

test("removing a word that two rules hold leaves it in neither", async () => {
  const { discord, moderator } =
    await discordHoldingFooTwiceAfterAnInterruptedChange()

  const data = new FormData()
  data.set("word", "foo")
  await removeBlockedWord(discord, moderator, data)

  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: [],
    [ONE_DAY]: ["bar"],
  })
})

test("choosing the action a word has, when no other rule holds it, succeeds and writes nothing", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo", "timeout-1h"))
  await addBlockedWord(discord, moderator, addition("bar"))
  const rules = await discord.listAutoModerationRules()
  const entries = await discord.getAuditLog({})

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1h")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » garde l’action « Exclusion 1 heure ».",
  })
  expect(await discord.listAutoModerationRules()).toEqual(rules)
  expect(await discord.getAuditLog({})).toEqual(entries)
})

test("choosing the action a word has, while a weaker rule still holds a copy of it, removes that copy alone, in one write whose reason names the weaker action", async () => {
  const { discord, moderator } =
    await discordHoldingFooTwiceAfterAnInterruptedChange()
  const before = await entryCount(discord)

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » garde l’action « Exclusion 1 jour ».",
  })
  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: [],
    [ONE_DAY]: ["bar", "foo"],
  })
  expect(await entryCount(discord)).toBe(before + 1)
  expect((await newestEntries(discord, 1))[0]).toMatchObject({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
    reason: reasonOf(BLOCK_TO_DAY),
  })
})

test("when Discord does not answer the first write, the result says as much as for the second, and the word may be in both rules", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  const rules = await discord.listAutoModerationRules()
  discord.failNext(
    "createAutoModerationRule",
    new DiscordError({ method: "POST", route: ROUTES.autoModerationRules })
  )

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  expect(result).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : « foo » est peut-être dans deux règles, « Bloquer seulement » et « Exclusion 1 jour ». Il reste bloqué. Recharge la page, puis change à nouveau son action ou retire-le.",
    word: "foo",
    action: "timeout-1d",
  })
  expect(await discord.listAutoModerationRules()).toEqual(rules)
})

test("when Discord does not answer before the first write, nothing has changed, and the result says so", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  const rules = await discord.listAutoModerationRules()
  const entries = await entryCount(discord)
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  expect(result).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : l’action de « foo » n’a pas changé. Réessaie dans un instant.",
    word: "foo",
    action: "timeout-1d",
  })
  expect(await discord.listAutoModerationRules()).toEqual(rules)
  expect(await entryCount(discord)).toBe(entries)
})

test("a rule that is full refuses the word, which stays in its old rule, and nothing is written", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  await addBlockedWord(discord, moderator, addition("mot0", "timeout-1h"))
  const [, hour] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, hour?.id ?? "", {
    trigger_metadata: {
      keyword_filter: Array.from({ length: 1000 }, (_, index) => `mot${index}`),
    },
  })
  const rules = await discord.listAutoModerationRules()
  const entries = await entryCount(discord)

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1h")
  )

  expect(result).toEqual({
    ok: false,
    message: `La règle « Exclusion 1 heure » compte déjà ${frenchNumber(1000)} mots interdits, le maximum d’AutoMod. Retires-en un, ou choisis une autre action.`,
    word: "foo",
    action: "timeout-1h",
  })
  expect(await discord.listAutoModerationRules()).toEqual(rules)
  expect(await entryCount(discord)).toBe(entries)
})

test("a Discord server with no room for the new action's rule refuses the word, which stays in its old rule, and nothing is written", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  for (let index = 1; index <= 5; index++) {
    discord.createAutoModerationRuleAs(ALDIS.id, {
      name: `Règle ${index}`,
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: { keyword_filter: [`mot${index}`] },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
    })
  }
  const rules = await discord.listAutoModerationRules()
  const entries = await entryCount(discord)

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  expect(result).toEqual({
    ok: false,
    message:
      "Le serveur Discord a déjà 6 règles AutoMod de mots-clés : le panel ne peut pas y créer la règle « Exclusion 1 jour ». Supprimes-en une dans Discord, ou choisis une autre action.",
    word: "foo",
    action: "timeout-1d",
  })
  expect(await discord.listAutoModerationRules()).toEqual(rules)
  expect(await entryCount(discord)).toBe(entries)
})

test("a word that no rule of the panel holds any more is refused, with nothing written", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("bar"))
  const entries = await entryCount(discord)

  const result = await changeActionOfBlockedWord(
    discord,
    moderator,
    change("foo", "timeout-1d")
  )

  expect(result).toEqual({
    ok: false,
    message: "« foo » n’est plus un mot interdit.",
    word: "foo",
    action: "timeout-1d",
  })
  expect(await keywordsByRule(discord)).toEqual({ [BLOCK_ONLY]: ["bar"] })
  expect(await entryCount(discord)).toBe(entries)
})

test("a staff member who does not moderate cannot give a word an action that times out, nor change a word that times out: the write throws, before anything is written", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  await addBlockedWord(discord, moderator, addition("bar", "timeout-1h"))
  const rules = await discord.listAutoModerationRules()
  const entries = await entryCount(discord)

  await expect(
    changeActionOfBlockedWord(discord, staffMember, change("foo", "timeout-1d"))
  ).rejects.toThrow()
  await expect(
    changeActionOfBlockedWord(discord, staffMember, change("bar", "block"))
  ).rejects.toThrow()
  await expect(
    changeActionOfBlockedWord(discord, staffMember, change("bar", "timeout-1d"))
  ).rejects.toThrow()

  expect(await discord.listAutoModerationRules()).toEqual(rules)
  expect(await entryCount(discord)).toBe(entries)
})

test("a staff member who does not moderate keeps a word that only blocks as it is, and writes nothing", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))
  const entries = await entryCount(discord)

  const result = await changeActionOfBlockedWord(
    discord,
    staffMember,
    change("foo", "block")
  )

  expect(result.ok).toBe(true)
  expect(await entryCount(discord)).toBe(entries)
})

test("a word is moved exactly as the list holds it, spaces included", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    trigger_metadata: { keyword_filter: ["foo", " foo "] },
  })

  await changeActionOfBlockedWord(
    discord,
    moderator,
    change(" foo ", "timeout-1d")
  )

  expect(await keywordsByRule(discord)).toEqual({
    [BLOCK_ONLY]: ["foo"],
    [ONE_DAY]: [" foo "],
  })
})

test("a form without a word, or without a known action, is refused, with the fields it sent", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)

  expect(
    await changeActionOfBlockedWord(discord, moderator, change("", "block"))
  ).toEqual({
    ok: false,
    message: "Saisis un mot ou une expression.",
    word: "",
    action: "block",
  })
  expect(
    await changeActionOfBlockedWord(discord, moderator, change("foo", "ban"))
  ).toEqual({
    ok: false,
    message: "Choisis une action.",
    word: "foo",
    action: "ban",
  })
})

test("a panel error is thrown, not returned", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  const missingPermissions = new DiscordError({
    method: "POST",
    route: ROUTES.autoModerationRules,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("createAutoModerationRule", missingPermissions)

  await expect(
    changeActionOfBlockedWord(discord, moderator, change("foo", "timeout-1d"))
  ).rejects.toBe(missingPermissions)
})
