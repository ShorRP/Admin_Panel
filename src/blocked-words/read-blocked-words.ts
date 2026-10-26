import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { isKeywordRule, isPanelRule, keywordsOf } from "./panel-rule"

export type OtherAutoModRule = {
  id: string
  name: string
  keywords: string[] | null
}

export type BlockedWords = {
  words: string[]
  otherRules: OtherAutoModRule[]
}

const frenchOrder = new Intl.Collator("fr")

export async function readBlockedWords(
  discord: DiscordApi
): Promise<BlockedWords> {
  const rules = await discord.listAutoModerationRules()
  const rule = rules.find(isPanelRule)
  return {
    words: rule === undefined ? [] : sortedKeywordsOf(rule),
    otherRules: rules
      .filter((other) => other !== rule)
      .map((other) => ({
        id: other.id,
        name: other.name,
        keywords: isKeywordRule(other) ? sortedKeywordsOf(other) : null,
      })),
  }
}

function sortedKeywordsOf(rule: APIAutoModerationRule) {
  return keywordsOf(rule).toSorted(frenchOrder.compare)
}
