import type { APIAutoModerationRule } from "discord-api-types/v10"

import { quoted } from "@/blocked-words/french-text"
import { MAX_KEYWORD_RULES } from "@/blocked-words/limits"
import { isKeywordRule } from "@/blocked-words/panel-rule"
import { LINK_RULE_NAME } from "./link-rule"

export function noRoomRefusal(rules: APIAutoModerationRule[]) {
  if (rules.filter(isKeywordRule).length < MAX_KEYWORD_RULES) {
    return null
  }
  return `Le serveur Discord a déjà ${MAX_KEYWORD_RULES} règles AutoMod de mots-clés : le panel ne peut pas y créer la règle ${quoted(LINK_RULE_NAME)}. Supprimes-en une dans Discord, puis réessaie.`
}
