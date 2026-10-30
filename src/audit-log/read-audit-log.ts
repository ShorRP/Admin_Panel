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
import { CHANGE_TYPES, type ChangeType } from "./change-type"
import { attributionOf, type EntryAttribution } from "./entry-attribution"
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

const CHANGE_TYPE = z.enum(CHANGE_TYPES).nullable().catch(null)

export async function readAuditLog(
  discord: DiscordApi,
  searchParams: { before?: unknown; type?: unknown }
): Promise<AuditLogPage> {
  const cursor = CURSOR.parse(searchParams.before)
  const type = CHANGE_TYPE.parse(searchParams.type)
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
  const events =
    type === null ? Object.values(EVENTS_OF_TYPE).flat() : EVENTS_OF_TYPE[type]
  const [ruleId, application] = await Promise.all([
    events.some((event) => AUTO_MOD_RULE_EVENTS.includes(event))
      ? panelRuleId(discord)
      : null,
    discord.getApplicationUser(),
  ])
  return eventReaders(ruleId, application.id).filter(({ actionType }) =>
    events.includes(actionType)
  )
}

async function panelRuleId(discord: DiscordApi) {
  return (await discord.listAutoModerationRules()).find(isPanelRule)?.id ?? null
}

function eventReaders(
  ruleId: Snowflake | null,
  applicationId: Snowflake
): EventReader[] {
  const sanctionReaders = STAFF_SANCTION_EVENTS.map((event) => ({
    actionType: event.actionType,
    changeOf: (entry: APIAuditLogEntry, users: Users) =>
      sanctionChangeOf(entry, event.changeOf(entry), users, applicationId),
  }))
  if (ruleId === null) {
    return sanctionReaders
  }
  const ruleReaders = AUTO_MOD_RULE_EVENTS.map((actionType) => ({
    actionType,
    changeOf: (entry: APIAuditLogEntry, users: Users) =>
      entry.target_id === ruleId
        ? ruleChangeOf(entry, users, applicationId)
        : null,
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

function ruleChangeOf(
  entry: APIAuditLogEntry,
  users: Users,
  applicationId: Snowflake
): FoundChange {
  const author = attributionOf(entry, users, applicationId)
  return {
    memberId: author.memberId,
    change: {
      kind: "rule",
      ...momentOf(entry, author),
      madeInDiscord: author.kind === "discord",
      description:
        author.kind === "panel"
          ? capitalized(author.reason)
          : "Règle modifiée dans Discord",
    },
  }
}

function sanctionChangeOf(
  entry: APIAuditLogEntry,
  sanctionChange: SanctionChange | null,
  users: Users,
  applicationId: Snowflake
): FoundChange | null {
  if (sanctionChange === null || entry.target_id === null) {
    return null
  }
  const author = attributionOf(entry, users, applicationId)
  const account = users.get(entry.target_id)
  return {
    memberId: author.memberId,
    change: {
      kind: "sanction-change",
      ...momentOf(entry, author),
      sanctionChange,
      account: {
        id: entry.target_id,
        name: account === undefined ? "Compte inconnu" : userName(account),
      },
      reason: author.reason,
    },
  }
}

function momentOf(entry: APIAuditLogEntry, { memberName }: EntryAttribution) {
  return { id: entry.id, date: snowflakeDate(entry.id), memberName }
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
