import "server-only"

import {
  AuditLogEvent,
  type APIAuditLogEntry,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"
import { z } from "zod"

import { isPanelRule } from "@/blocked-words/panel-rule"
import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { memberAvatarUrl } from "@/discord/member-avatar-url"
import { userName } from "@/discord/member-name"
import { snowflakeDate } from "@/discord/snowflake-date"
import {
  STAFF_SANCTION_EVENTS,
  type SanctionChange,
} from "@/sanctions/sanction-events"
import { auditLogPages } from "./audit-log-pages"
import { panelReasonOf, type PanelReason } from "./audit-log-reason"
import { parisDayOf } from "./paris-day"

export type AuditLogChange = {
  id: Snowflake
  date: Date
  memberName: string
  avatarUrl: string | null
} & (
  | { kind: "rule"; description: string; madeInDiscord: boolean }
  | {
      kind: "sanction-change"
      sanctionChange: SanctionChange
      account: { id: Snowflake; name: string }
      reason: string | null
    }
)

type WithoutAvatar<Change> = Change extends unknown
  ? Omit<Change, "avatarUrl">
  : never

type FoundChange = {
  memberId: Snowflake | null
  change: WithoutAvatar<AuditLogChange>
}

type Users = Map<Snowflake, APIUser>

type EventReader = {
  actionType: AuditLogEvent
  changeOf: (entry: APIAuditLogEntry, users: Users) => FoundChange | null
}

export type AuditLogDay = { date: Date; changes: AuditLogChange[] }

export type ChangeType = (typeof CHANGE_TYPES)[number]

export type AuditLogPage = {
  type: ChangeType | null
  days: AuditLogDay[]
  before: Snowflake | null
  older: Snowflake | null
}

const AUTO_MOD_RULE_EVENTS = [
  AuditLogEvent.AutoModerationRuleCreate,
  AuditLogEvent.AutoModerationRuleUpdate,
]

const CHANGE_TYPES = ["blocked-words", "timeouts", "kicks", "bans"] as const

const EVENTS_OF_TYPE: Record<ChangeType, AuditLogEvent[]> = {
  "blocked-words": AUTO_MOD_RULE_EVENTS,
  timeouts: [AuditLogEvent.MemberUpdate],
  kicks: [AuditLogEvent.MemberKick],
  bans: [AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberBanRemove],
}

const CHANGES_PER_PAGE = 50

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

const CURSOR = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)
  .nullable()
  .catch(null)

const TYPE = z.enum(CHANGE_TYPES).nullable().catch(null)

export async function readAuditLog(
  discord: DiscordApi,
  searchParams: { before?: unknown; type?: unknown }
): Promise<AuditLogPage> {
  const cursor = CURSOR.parse(searchParams.before)
  const type = TYPE.parse(searchParams.type)
  const found: FoundChange[] = []
  for (const reader of await eventReadersOfType(discord, type)) {
    found.push(...(await changesOfEvent(discord, reader, cursor)))
  }
  const pageChanges = found.toSorted(newestFirst).slice(0, CHANGES_PER_PAGE)
  const avatarUrls = await avatarUrlsByMemberId(
    discord,
    pageChanges.map(({ memberId }) => memberId)
  )
  return {
    type,
    days: byParisDay(
      pageChanges.map(({ memberId, change }) => ({
        ...change,
        avatarUrl:
          memberId === null ? null : (avatarUrls.get(memberId) ?? null),
      }))
    ),
    before: cursor,
    older:
      found.length > CHANGES_PER_PAGE
        ? (pageChanges.at(-1)?.change.id ?? null)
        : null,
  }
}

async function eventReadersOfType(
  discord: DiscordApi,
  type: ChangeType | null
) {
  if (type === null) {
    return eventReaders(await panelRuleId(discord))
  }
  const events = EVENTS_OF_TYPE[type]
  const ruleId = type === "blocked-words" ? await panelRuleId(discord) : null
  return eventReaders(ruleId).filter(({ actionType }) =>
    events.includes(actionType)
  )
}

async function panelRuleId(discord: DiscordApi) {
  return (await discord.listAutoModerationRules()).find(isPanelRule)?.id ?? null
}

function eventReaders(ruleId: Snowflake | null): EventReader[] {
  const sanctionReaders = STAFF_SANCTION_EVENTS.map((event) => ({
    actionType: event.actionType,
    changeOf: (entry: APIAuditLogEntry, users: Users) =>
      sanctionChangeOf(entry, event.changeOf(entry), users),
  }))
  if (ruleId === null) {
    return sanctionReaders
  }
  const ruleReaders = AUTO_MOD_RULE_EVENTS.map((actionType) => ({
    actionType,
    changeOf: (entry: APIAuditLogEntry, users: Users) =>
      entry.target_id === ruleId ? ruleChangeOf(entry, users) : null,
  }))
  return [...ruleReaders, ...sanctionReaders]
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

async function changesOfEvent(
  discord: DiscordApi,
  { actionType, changeOf }: EventReader,
  olderThan: Snowflake | null
) {
  const changes: FoundChange[] = []
  for await (const log of auditLogPages(discord, actionType, olderThan)) {
    const users = new Map(log.users.map((user) => [user.id, user]))
    for (const entry of log.audit_log_entries) {
      const change = changeOf(entry, users)
      if (change !== null) {
        changes.push(change)
      }
    }
    if (changes.length > CHANGES_PER_PAGE) {
      break
    }
  }
  return changes
}

function ruleChangeOf(entry: APIAuditLogEntry, users: Users): FoundChange {
  const reason = panelReasonIn(entry)
  const { memberId, ...moment } = momentOf(entry, reason, users)
  return {
    memberId,
    change: {
      kind: "rule",
      ...moment,
      madeInDiscord: reason === null,
      description:
        reason === null
          ? "Règle modifiée dans Discord"
          : capitalized(reason.change),
    },
  }
}

function sanctionChangeOf(
  entry: APIAuditLogEntry,
  sanctionChange: SanctionChange | null,
  users: Users
): FoundChange | null {
  if (sanctionChange === null || entry.target_id === null) {
    return null
  }
  const reason = panelReasonIn(entry)
  const { memberId, ...moment } = momentOf(entry, reason, users)
  const account = users.get(entry.target_id)
  return {
    memberId,
    change: {
      kind: "sanction-change",
      ...moment,
      sanctionChange,
      account: {
        id: entry.target_id,
        name: account === undefined ? "Compte inconnu" : userName(account),
      },
      reason: reason === null ? (entry.reason ?? null) : reason.change,
    },
  }
}

function panelReasonIn(entry: APIAuditLogEntry) {
  return entry.reason === undefined ? null : panelReasonOf(entry.reason)
}

function momentOf(
  entry: APIAuditLogEntry,
  reason: PanelReason | null,
  users: Users
) {
  const moment = { id: entry.id, date: snowflakeDate(entry.id) }
  if (reason !== null) {
    return {
      ...moment,
      memberId: reason.staffMemberId,
      memberName: reason.staffMemberName,
    }
  }
  const user = users.get(entry.user_id ?? "")
  return {
    ...moment,
    memberId: entry.user_id,
    memberName: user === undefined ? "Membre inconnu" : userName(user),
  }
}

function byParisDay(changes: AuditLogChange[]) {
  const days: AuditLogDay[] = []
  for (const change of changes) {
    const day = days.at(-1)
    if (day !== undefined && parisDayOf(day.date) === parisDayOf(change.date)) {
      day.changes.push(change)
    } else {
      days.push({ date: change.date, changes: [change] })
    }
  }
  return days
}

function newestFirst(left: FoundChange, right: FoundChange) {
  return BigInt(left.change.id) > BigInt(right.change.id) ? -1 : 1
}

function capitalized(text: string) {
  return text.charAt(0).toLocaleUpperCase("fr") + text.slice(1)
}
