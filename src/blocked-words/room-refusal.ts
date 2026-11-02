import type { APIAutoModerationRule } from "discord-api-types/v10"

import type { BlockedWordAction } from "./blocked-word-action"
import { frenchNumber, quoted } from "./french-text"
import { MAX_KEYWORD_RULES, MAX_WORDS_PER_RULE } from "./limits"
import { isKeywordRule, keywordsOf } from "./panel-rule"

export function roomRefusal(
  rules: APIAutoModerationRule[],
  rule: APIAutoModerationRule | undefined,
  action: BlockedWordAction
) {
  return rule === undefined
    ? noRoomRefusal(rules, action)
    : fullRuleRefusal(rule, action)
}

function noRoomRefusal(
  rules: APIAutoModerationRule[],
  action: BlockedWordAction
) {
  if (rules.filter(isKeywordRule).length < MAX_KEYWORD_RULES) {
    return null
  }
  return `Le serveur Discord a déjà ${MAX_KEYWORD_RULES} règles AutoMod de mots-clés : le panel ne peut pas y créer la règle ${quoted(action.label)}. Supprimes-en une dans Discord, ou choisis une autre action.`
}

function fullRuleRefusal(
  rule: APIAutoModerationRule,
  action: BlockedWordAction
) {
  if (keywordsOf(rule).length < MAX_WORDS_PER_RULE) {
    return null
  }
  return `La règle ${quoted(action.label)} compte déjà ${frenchNumber(MAX_WORDS_PER_RULE)} mots interdits, le maximum d’AutoMod. Retires-en un, ou choisis une autre action.`
}
