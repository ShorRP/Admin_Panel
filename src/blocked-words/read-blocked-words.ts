import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { strongestOf, type BlockedWordActionId } from "./blocked-word-action"
import { isKeywordRule, keywordsOf, panelRulesOf } from "./panel-rule"

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
  const actionsOfWord = Map.groupBy(
    panelRules.flatMap(({ rule, action }) =>
      keywordsOf(rule).map((word) => ({ word, action: action.id }))
    ),
    ({ word }) => word
  )
  return {
    words: Array.from(actionsOfWord)
      .flatMap(([word, held]) => {
        const action = strongestOf(held.map(({ action }) => action))
        return action === null ? [] : [{ word, action: action.id }]
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
