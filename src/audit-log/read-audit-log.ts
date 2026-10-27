import "server-only"

import {
  AuditLogEvent,
  type APIAuditLogEntry,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"
import { z } from "zod"

import { panelReasonOf } from "@/blocked-words/audit-log-reason"
import { isPanelRule } from "@/blocked-words/panel-rule"
import type { DiscordApi } from "@/discord/discord-api"

export type AuditLogChange = {
  id: Snowflake
  date: Date
  memberName: string
  description: string
}

export type AuditLogPage = {
  changes: AuditLogChange[]
  before: Snowflake | null
  older: Snowflake | null
}

const AUTO_MOD_RULE_EVENTS = [
  AuditLogEvent.AutoModerationRuleCreate,
  AuditLogEvent.AutoModerationRuleUpdate,
]

const CHANGES_PER_PAGE = 50

const DISCORD_PAGE_SIZE = 100

const DISCORD_EPOCH = BigInt(1420070400000)

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

const CURSOR = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)
  .nullable()
  .catch(null)

export async function readAuditLog(
  discord: DiscordApi,
  before: unknown
): Promise<AuditLogPage> {
  const cursor = CURSOR.parse(before)
  const rule = (await discord.listAutoModerationRules()).find(isPanelRule)
  if (rule === undefined) {
    return { changes: [], before: cursor, older: null }
  }
  const found: AuditLogChange[] = []
  for (const actionType of AUTO_MOD_RULE_EVENTS) {
    found.push(
      ...(await panelRuleChanges(discord, actionType, rule.id, cursor))
    )
  }
  const changes = found.toSorted(newestFirst).slice(0, CHANGES_PER_PAGE)
  return {
    changes,
    before: cursor,
    older:
      found.length > CHANGES_PER_PAGE ? (changes.at(-1)?.id ?? null) : null,
  }
}

async function panelRuleChanges(
  discord: DiscordApi,
  actionType: AuditLogEvent,
  ruleId: Snowflake,
  olderThan: Snowflake | null
) {
  const changes: AuditLogChange[] = []
  let discordCursor = olderThan
  for (;;) {
    const log = await discord.getAuditLog({
      action_type: actionType,
      limit: DISCORD_PAGE_SIZE,
      ...(discordCursor === null ? {} : { before: discordCursor }),
    })
    const users = new Map(log.users.map((user) => [user.id, user]))
    changes.push(
      ...log.audit_log_entries
        .filter((entry) => entry.target_id === ruleId)
        .map((entry) => changeOf(entry, users))
    )
    const oldest = log.audit_log_entries.at(-1)
    if (
      changes.length > CHANGES_PER_PAGE ||
      oldest === undefined ||
      log.audit_log_entries.length < DISCORD_PAGE_SIZE
    ) {
      return changes
    }
    discordCursor = oldest.id
  }
}

function changeOf(
  entry: APIAuditLogEntry,
  users: Map<Snowflake, APIUser>
): AuditLogChange {
  const moment = { id: entry.id, date: dateOf(entry.id) }
  const reason = entry.reason === undefined ? null : panelReasonOf(entry.reason)
  if (reason !== null) {
    return {
      ...moment,
      memberName: reason.staffMemberName,
      description: capitalized(reason.change),
    }
  }
  const user = users.get(entry.user_id ?? "")
  return {
    ...moment,
    memberName: user?.global_name ?? user?.username ?? "Membre inconnu",
    description: "Règle modifiée dans Discord",
  }
}

function dateOf(id: Snowflake) {
  return new Date(Number((BigInt(id) >> BigInt(22)) + DISCORD_EPOCH))
}

function newestFirst(left: { id: Snowflake }, right: { id: Snowflake }) {
  return BigInt(left.id) > BigInt(right.id) ? -1 : 1
}

function capitalized(text: string) {
  return text.charAt(0).toLocaleUpperCase("fr") + text.slice(1)
}
