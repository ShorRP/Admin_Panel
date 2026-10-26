import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { newPanelRule } from "./panel-rule"
import { readBlockedWords } from "./read-blocked-words"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test("the blocked words are the keywords of the panel's rule, in French alphabetical order", async () => {
  const discord = new FakeDiscord()
  await discord.createAutoModerationRule(
    newPanelRule(["zèbre", "Éclair", "abricot", "élan"]),
    "Created by the panel"
  )

  const { words } = await readBlockedWords(discord)

  expect(words).toEqual(["abricot", "Éclair", "élan", "zèbre"])
})

test("before the panel's rule exists there is no blocked word, and reading creates none", async () => {
  const discord = new FakeDiscord()

  expect(await readBlockedWords(discord)).toEqual({
    words: [],
    otherRules: [],
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("the other AutoMod rules come with their name, and a keyword rule with its keywords, in French alphabetical order", async () => {
  const discord = new FakeDiscord({ members: [{ user: ALDIS }] })
  const links = discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Liens",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["www", "http"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })
  await discord.createAutoModerationRule(
    newPanelRule(["foo"]),
    "Created by the panel"
  )
  const mentions = discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Mentions",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.MentionSpam,
    trigger_metadata: { mention_total_limit: 5 },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })

  const { otherRules } = await readBlockedWords(discord)

  expect(otherRules).toEqual([
    { id: links.id, name: "Liens", keywords: ["http", "www"] },
    { id: mentions.id, name: "Mentions", keywords: null },
  ])
})
