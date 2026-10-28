import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { frenchNumber, quoted } from "./french-text"
import { MAX_BLOCKED_WORDS, MAX_KEYWORD_RULES } from "./limits"
import {
  isKeywordRule,
  isPanelRule,
  keywordsOf,
  newPanelRule,
  withKeywords,
} from "./panel-rule"
import { submittedWord } from "./submitted-word"
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
  const submitted = submittedWord(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.typed)
  }
  const { typed, word } = submitted
  return await unlessDiscordUnavailable(typed, async () => {
    const rules = await discord.listAutoModerationRules()
    const rule = rules.find(isPanelRule)
    const refusal =
      rule === undefined
        ? creationRefusal(rules)
        : additionRefusal(keywordsOf(rule), word)
    if (refusal !== null) {
      return failure(refusal, typed)
    }
    const reason = auditLogReason(staffMember, `ajout de ${quoted(word)}`)
    if (rule === undefined) {
      await discord.createAutoModerationRule(newPanelRule([word]), reason)
    } else {
      await discord.modifyAutoModerationRule(
        rule.id,
        withKeywords(rule, [...keywordsOf(rule), word]),
        reason
      )
    }
    return {
      ok: true,
      message: `${quoted(word)} est maintenant un mot interdit.`,
    }
  })
}

function creationRefusal(rules: APIAutoModerationRule[]) {
  if (rules.filter(isKeywordRule).length < MAX_KEYWORD_RULES) {
    return null
  }
  return `Le serveur a déjà ${MAX_KEYWORD_RULES} règles AutoMod de mots-clés. Supprimes-en une dans Discord pour que le panel crée la sienne.`
}

function additionRefusal(keywords: string[], word: string) {
  const same = keywords.find(
    (keyword) => keyword.toLowerCase() === word.toLowerCase()
  )
  if (same !== undefined) {
    return `${quoted(same)} est déjà un mot interdit.`
  }
  if (keywords.length >= MAX_BLOCKED_WORDS) {
    return `La règle du panel compte déjà ${frenchNumber(MAX_BLOCKED_WORDS)} mots interdits, le maximum d’AutoMod. Retires-en un pour en ajouter un autre.`
  }
  return null
}
