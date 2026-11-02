import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { blockedWordAction } from "./blocked-word-action"
import { newPanelRule } from "./panel-rule"
import { readBlockedWords } from "./read-blocked-words"

const STAFF_ROLE_ID = "1300000000000000000"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

async function createPanelRule(
  discord: FakeDiscord,
  action: "block" | "timeout-1h" | "timeout-1d",
  keywords: string[]
) {
  return await discord.createAutoModerationRule(
    newPanelRule(blockedWordAction(action), STAFF_ROLE_ID, keywords),
    "Created by the panel"
  )
}

function handMadeRule(
  name: string,
  triggerType: AutoModerationRuleTriggerType,
  keywords: string[]
) {
  return {
    name,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: triggerType,
    trigger_metadata: { keyword_filter: keywords },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  }
}

test("the blocked words are the keywords of the panel's rules, each with its rule's action, in French alphabetical order", async () => {
  const discord = new FakeDiscord()
  await createPanelRule(discord, "block", ["zèbre", "abricot"])
  await createPanelRule(discord, "timeout-1d", ["élan"])
  await createPanelRule(discord, "timeout-1h", ["Éclair"])

  const { words } = await readBlockedWords(discord)

  expect(words).toEqual([
    { word: "abricot", action: "block" },
    { word: "Éclair", action: "timeout-1h" },
    { word: "élan", action: "timeout-1d" },
    { word: "zèbre", action: "block" },
  ])
})

test("before any panel rule exists there is no blocked word, and reading creates none", async () => {
  const discord = new FakeDiscord()

  expect(await readBlockedWords(discord)).toEqual({
    words: [],
    otherRules: [],
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a word that several panel rules hold, after a retouch in Discord, is read once, with the strongest action", async () => {
  const discord = new FakeDiscord()
  await createPanelRule(discord, "timeout-1h", ["foo", "bar"])
  await createPanelRule(discord, "block", ["foo", "baz"])
  await createPanelRule(discord, "timeout-1d", ["bar"])

  const { words } = await readBlockedWords(discord)

  expect(words).toEqual([
    { word: "bar", action: "timeout-1d" },
    { word: "baz", action: "block" },
    { word: "foo", action: "timeout-1h" },
  ])
})

test("two words that differ by their case, held by two rules after a retouch in Discord, are read as two words, each with its action", async () => {
  const discord = new FakeDiscord()
  await createPanelRule(discord, "timeout-1h", ["Foo"])
  await createPanelRule(discord, "block", ["foo"])

  const { words } = await readBlockedWords(discord)

  expect(words).toEqual([
    { word: "foo", action: "block" },
    { word: "Foo", action: "timeout-1h" },
  ])
})

test("every rule that is not the panel's comes with its name, and a keyword rule with its keywords, in French alphabetical order, a panel rule renamed in Discord included", async () => {
  const discord = new FakeDiscord({ members: [{ user: ALDIS }] })
  const links = discord.createAutoModerationRuleAs(
    ALDIS.id,
    handMadeRule("Liens", AutoModerationRuleTriggerType.Keyword, [
      "www",
      "http",
    ])
  )
  const renamed = await createPanelRule(discord, "timeout-1h", ["foo"])
  discord.modifyAutoModerationRuleAs(ALDIS.id, renamed.id, {
    name: "Exclusion (ancienne)",
  })
  await createPanelRule(discord, "block", ["bar"])
  const mentions = discord.createAutoModerationRuleAs(ALDIS.id, {
    ...handMadeRule("Mentions", AutoModerationRuleTriggerType.MentionSpam, []),
    trigger_metadata: { mention_total_limit: 5 },
  })
  const namedLikeThePanel = discord.createAutoModerationRuleAs(ALDIS.id, {
    ...handMadeRule(
      "Mots interdits du panel · exclusion 1 jour",
      AutoModerationRuleTriggerType.MentionSpam,
      []
    ),
    trigger_metadata: { mention_total_limit: 5 },
  })

  const { words, otherRules } = await readBlockedWords(discord)

  expect(words).toEqual([{ word: "bar", action: "block" }])
  expect(otherRules).toEqual([
    { id: links.id, name: "Liens", keywords: ["http", "www"] },
    { id: renamed.id, name: "Exclusion (ancienne)", keywords: ["foo"] },
    { id: mentions.id, name: "Mentions", keywords: null },
    {
      id: namedLikeThePanel.id,
      name: "Mots interdits du panel · exclusion 1 jour",
      keywords: null,
    },
  ])
})

test("a keyword rule given a panel rule's name by hand is read as the panel's", async () => {
  const discord = new FakeDiscord({ members: [{ user: ALDIS }] })
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    handMadeRule(
      "Mots interdits du panel · exclusion 1 heure",
      AutoModerationRuleTriggerType.Keyword,
      ["http"]
    )
  )

  expect(await readBlockedWords(discord)).toEqual({
    words: [{ word: "http", action: "timeout-1h" }],
    otherRules: [],
  })
})
