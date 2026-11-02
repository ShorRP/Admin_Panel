import "server-only"

import type { APIAutoModerationRule } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { requireRightTo, type BlockedWordAction } from "./blocked-word-action"
import { actionChangeReason } from "./blocked-word-reason"
import { quoted } from "./french-text"
import {
  keywordsOf,
  newPanelRule,
  panelRulesOf,
  strongestHeld,
  withKeywords,
  type PanelRule,
} from "./panel-rule"
import { roomRefusal } from "./room-refusal"
import { submittedBlockedWord } from "./submitted-word"
import {
  failure,
  unlessDiscordUnavailable,
  type WordFields,
  type WriteResult,
} from "./write-result"

type Plan = {
  word: string
  current: BlockedWordAction
  previous: BlockedWordAction
  to: BlockedWordAction
  entering: { rule: APIAutoModerationRule | undefined } | null
  leaving: PanelRule[]
}

export async function changeActionOfBlockedWord(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult> {
  const submitted = submittedBlockedWord(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, action } = submitted
  const { word } = fields
  requireRightTo(staffMember, action)
  const planned = await unlessDiscordUnavailable(
    fields,
    () => planOf(discord, staffMember, fields, action),
    notChangedMessage(word)
  )
  if ("ok" in planned) {
    return planned
  }
  return await unlessDiscordUnavailable(
    fields,
    () => write(discord, staffMember, planned),
    maybeInTwoRulesMessage(planned)
  )
}

async function planOf(
  discord: DiscordApi,
  staffMember: StaffMember,
  fields: WordFields,
  to: BlockedWordAction
): Promise<Plan | WriteResult> {
  const { word } = fields
  const rules = await discord.listAutoModerationRules()
  const panelRules = panelRulesOf(rules)
  const holding = panelRules.filter(({ rule }) =>
    keywordsOf(rule).includes(word)
  )
  const current = strongestHeld(holding)
  if (current === null) {
    return failure(`${quoted(word)} n’est plus un mot interdit.`, fields)
  }
  requireRightTo(staffMember, current.action)
  const target = panelRules.find(({ action }) => action.id === to.id)?.rule
  const leaving = holding.filter(({ rule }) => rule.id !== target?.id)
  const entering = leaving.length < holding.length ? null : { rule: target }
  const refusal =
    entering === null ? null : roomRefusal(rules, entering.rule, to)
  if (refusal !== null) {
    return failure(refusal, fields)
  }
  return {
    word,
    current: current.action,
    previous: strongestHeld(leaving)?.action ?? current.action,
    to,
    entering,
    leaving,
  }
}

async function write(
  discord: DiscordApi,
  staffMember: StaffMember,
  { word, current, previous, to, entering, leaving }: Plan
): Promise<WriteResult> {
  if (entering !== null) {
    const reason = auditLogReason(
      staffMember,
      actionChangeReason(word, previous, to)
    )
    if (entering.rule === undefined) {
      await discord.createAutoModerationRule(
        newPanelRule(to, staffMember.staffRoleId, [word]),
        reason
      )
    } else {
      await discord.modifyAutoModerationRule(
        entering.rule.id,
        withKeywords(entering.rule, [...keywordsOf(entering.rule), word]),
        reason
      )
    }
  }
  for (const { rule, action } of leaving) {
    await discord.modifyAutoModerationRule(
      rule.id,
      withKeywords(
        rule,
        keywordsOf(rule).filter((keyword) => keyword !== word)
      ),
      auditLogReason(staffMember, actionChangeReason(word, action, to))
    )
  }
  return {
    ok: true,
    message:
      current.id === to.id
        ? `${quoted(word)} garde l’action ${quoted(to.label)}.`
        : `${quoted(word)} passe à ${quoted(to.label)}.`,
  }
}

function notChangedMessage(word: string) {
  return `Discord n’a pas répondu : l’action de ${quoted(word)} n’a pas changé. Réessaie dans un instant.`
}

function maybeInTwoRulesMessage({ word, previous, to }: Plan) {
  return `Discord n’a pas répondu : ${quoted(word)} est peut-être dans deux règles, ${quoted(previous.label)} et ${quoted(to.label)}. Il reste bloqué. Recharge la page, puis change à nouveau son action ou retire-le.`
}
