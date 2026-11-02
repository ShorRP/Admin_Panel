import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { requireRightTo, type BlockedWordAction } from "./blocked-word-action"
import { frenchNumber, quoted } from "./french-text"
import { MAX_KEYWORD_RULES, MAX_WORDS_PER_RULE } from "./limits"
import {
  heldWordsOf,
  isKeywordRule,
  keywordsOf,
  newPanelRule,
  panelRulesOf,
  strongestHeld,
  withKeywords,
  type PanelRule,
} from "./panel-rule"
import { submittedBlockedWord } from "./submitted-word"
import {
  failure,
  unlessDiscordUnavailable,
  type WriteResult,
} from "./write-result"

export async function addBlockedWord(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult> {
  const submitted = submittedBlockedWord(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, word, action } = submitted
  requireRightTo(staffMember, action)
  return await unlessDiscordUnavailable(fields, async () => {
    const rules = await discord.listAutoModerationRules()
    const panelRules = panelRulesOf(rules)
    const rule = panelRules.find(
      (panelRule) => panelRule.action.id === action.id
    )?.rule
    const refusal =
      duplicateRefusal(panelRules, word) ??
      (rule === undefined
        ? noRoomRefusal(rules, action)
        : fullRuleRefusal(rule, action))
    if (refusal !== null) {
      return failure(refusal, fields)
    }
    const reason = auditLogReason(
      staffMember,
      `ajout de ${quoted(word)}, action ${quoted(action.label)}`
    )
    if (rule === undefined) {
      await discord.createAutoModerationRule(
        newPanelRule(action, staffMember.staffRoleId, [word]),
        reason
      )
    } else {
      await discord.modifyAutoModerationRule(
        rule.id,
        withKeywords(rule, [...keywordsOf(rule), word]),
        reason
      )
    }
    return {
      ok: true,
      message: `${quoted(word)} est maintenant un mot interdit, action ${quoted(action.label)}.`,
    }
  })
}

function duplicateRefusal(panelRules: PanelRule[], word: string) {
  const strongest = strongestHeld(
    heldWordsOf(panelRules).filter(
      (held) => held.word.toLowerCase() === word.toLowerCase()
    )
  )
  if (strongest === null) {
    return null
  }
  return `${quoted(strongest.word)} est déjà un mot interdit, action ${quoted(strongest.action.label)}.`
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
