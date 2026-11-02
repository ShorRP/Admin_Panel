import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import type { BlockedWordActionId } from "./blocked-word-action"
import {
  heldWordsOf,
  isKeywordRule,
  keywordsOf,
  panelRulesOf,
  strongestHeld,
} from "./panel-rule"

export type OtherAutoModRule = {
  id: string
  name: string
  keywords: string[] | null
}

export type BlockedWord = { word: string; action: BlockedWordActionId }

export type BlockedWords = {
  words: BlockedWord[]
  otherRules: OtherAutoModRule[]
}

const frenchOrder = new Intl.Collator("fr")

export async function readBlockedWords(
  discord: DiscordApi
): Promise<BlockedWords> {
  const rules = await discord.listAutoModerationRules()
  const panelRules = panelRulesOf(rules)
  const holders = Map.groupBy(heldWordsOf(panelRules), ({ word }) => word)
  return {
    words: Array.from(holders.values())
      .flatMap((held) => {
        const strongest = strongestHeld(held)
        return strongest === null
          ? []
          : [{ word: strongest.word, action: strongest.action.id }]
      })
      .toSorted((left, right) => frenchOrder.compare(left.word, right.word)),
    otherRules: rules
      .filter((rule) => !panelRules.some((panel) => panel.rule === rule))
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
