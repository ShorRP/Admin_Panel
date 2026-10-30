import "server-only"

import {
  AuditLogEvent,
  type APIAuditLogEntry,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"

import { auditLogPages } from "@/audit-log/audit-log-pages"
import { attributionOf } from "@/audit-log/entry-attribution"
import type { DiscordApi } from "@/discord/discord-api"
import { snowflakeDate } from "@/discord/snowflake-date"
import type { AccountRecord } from "@/records/read-record"
import {
  STAFF_SANCTION_EVENTS,
  type SanctionChange,
  type SanctionEvent,
} from "./sanction-events"

export type SanctionAuthor =
  | { kind: "panel"; staffMemberName: string }
  | { kind: "discord"; memberName: string }
  | { kind: "auto-moderation"; ruleName: string | null }

export type SanctionHistoryEntry = {
  id: Snowflake
  date: Date
  change: SanctionChange
  author: SanctionAuthor
  reason: string | null
}

const SANCTION_EVENTS: SanctionEvent[] = [
  ...STAFF_SANCTION_EVENTS,
  {
    actionType: AuditLogEvent.AutoModerationUserCommunicationDisabled,
    changeOf: () => ({ kind: "timeout", end: null }),
  },
]

export async function readSanctionHistory(
  discord: DiscordApi,
  record: AccountRecord | null
): Promise<SanctionHistoryEntry[] | null> {
  if (record === null) {
    return null
  }
  const { id: applicationId } = await discord.getApplicationUser()
  const history: SanctionHistoryEntry[] = []
  for (const event of SANCTION_EVENTS) {
    history.push(
      ...(await historyOfEvent(discord, event, record.id, applicationId))
    )
  }
  return history.toSorted(newestFirst)
}

async function historyOfEvent(
  discord: DiscordApi,
  { actionType, changeOf }: SanctionEvent,
  accountId: Snowflake,
  applicationId: Snowflake
) {
  const history: SanctionHistoryEntry[] = []
  for await (const log of auditLogPages(discord, actionType, null)) {
    const users = new Map(log.users.map((user) => [user.id, user]))
    for (const entry of log.audit_log_entries) {
      const change = entry.target_id === accountId ? changeOf(entry) : null
      if (change !== null) {
        history.push(historyEntryOf(entry, change, users, applicationId))
      }
    }
  }
  return history
}

function historyEntryOf(
  entry: APIAuditLogEntry,
  change: SanctionChange,
  users: Map<Snowflake, APIUser>,
  applicationId: Snowflake
): SanctionHistoryEntry {
  const moment = { id: entry.id, date: snowflakeDate(entry.id), change }
  if (
    entry.action_type === AuditLogEvent.AutoModerationUserCommunicationDisabled
  ) {
    return {
      ...moment,
      author: {
        kind: "auto-moderation",
        ruleName: entry.options?.auto_moderation_rule_name ?? null,
      },
      reason: entry.reason ?? null,
    }
  }
  const author = attributionOf(entry, users, applicationId)
  return {
    ...moment,
    author:
      author.kind === "panel"
        ? { kind: "panel", staffMemberName: author.memberName }
        : { kind: "discord", memberName: author.memberName },
    reason: author.reason,
  }
}

function newestFirst(left: { id: Snowflake }, right: { id: Snowflake }) {
  return BigInt(left.id) > BigInt(right.id) ? -1 : 1
}
