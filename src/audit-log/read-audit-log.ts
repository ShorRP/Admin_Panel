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
import { DiscordError } from "@/discord/discord-error"
import { memberAvatarUrl } from "@/discord/member-avatar-url"
import { snowflakeDate } from "@/discord/snowflake-date"

export type AuditLogChange = {
  id: Snowflake
  date: Date
  memberName: string
  avatarUrl: string | null
  description: string
}

type ChangeWithMemberId = Omit<AuditLogChange, "avatarUrl"> & {
  memberId: Snowflake | null
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
  const found: ChangeWithMemberId[] = []
  for (const actionType of AUTO_MOD_RULE_EVENTS) {
    found.push(
      ...(await panelRuleChanges(discord, actionType, rule.id, cursor))
    )
  }
  const pageChanges = found.toSorted(newestFirst).slice(0, CHANGES_PER_PAGE)
  const avatarUrls = await avatarUrlsByMemberId(
    discord,
    pageChanges.map(({ memberId }) => memberId)
  )
  return {
    changes: pageChanges.map(({ memberId, ...change }) => ({
      ...change,
      avatarUrl: memberId === null ? null : (avatarUrls.get(memberId) ?? null),
    })),
    before: cursor,
    older:
      found.length > CHANGES_PER_PAGE ? (pageChanges.at(-1)?.id ?? null) : null,
  }
}

async function avatarUrlsByMemberId(
  discord: DiscordApi,
  memberIds: (Snowflake | null)[]
) {
  const distinct = new Set(memberIds.filter((id) => id !== null))
  return new Map(
    await Promise.all(
      Array.from(
        distinct,
        async (id) => [id, await avatarUrlOf(discord, id)] as const
      )
    )
  )
}

async function avatarUrlOf(discord: DiscordApi, memberId: Snowflake) {
  try {
    const member = await discord.getMember(memberId)
    return member === null ? null : memberAvatarUrl(discord.guildId, member)
  } catch (error) {
    if (error instanceof DiscordError) {
      return null
    }
    throw error
  }
}

async function panelRuleChanges(
  discord: DiscordApi,
  actionType: AuditLogEvent,
  ruleId: Snowflake,
  olderThan: Snowflake | null
) {
  const changes: ChangeWithMemberId[] = []
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
): ChangeWithMemberId {
  const moment = { id: entry.id, date: snowflakeDate(entry.id) }
  const reason = entry.reason === undefined ? null : panelReasonOf(entry.reason)
  if (reason !== null) {
    return {
      ...moment,
      memberName: reason.staffMemberName,
      memberId: reason.staffMemberId,
      description: capitalized(reason.change),
    }
  }
  const user = users.get(entry.user_id ?? "")
  return {
    ...moment,
    memberName: user?.global_name ?? user?.username ?? "Membre inconnu",
    memberId: entry.user_id,
    description: "Règle modifiée dans Discord",
  }
}

function newestFirst(left: { id: Snowflake }, right: { id: Snowflake }) {
  return BigInt(left.id) > BigInt(right.id) ? -1 : 1
}

function capitalized(text: string) {
  return text.charAt(0).toLocaleUpperCase("fr") + text.slice(1)
}
