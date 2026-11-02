import "server-only"

import {
  AuditLogEvent,
  type APIAuditLogEntry,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"
import { z } from "zod"

import type { BlockedWordAction } from "@/blocked-words/blocked-word-action"
import { panelRulesOf } from "@/blocked-words/panel-rule"
import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { memberAvatarUrl } from "@/discord/member-avatar-url"
import { userName } from "@/discord/member-name"
import { snowflakeDate } from "@/discord/snowflake-date"
import {
  STAFF_SANCTION_EVENTS,
  type SanctionChange,
} from "@/sanctions/sanction-events"
import {
  actionChangeEntryOf,
  capitalized,
  joinActionChanges,
  type ActionChangeEntry,
} from "./action-change-entries"
import {
  auditLogFiltersOf,
  identityMatcher,
  type AccountIdentity,
  type AuditLogFilters,
} from "./audit-log-filters"
import { auditLogPages } from "./audit-log-pages"
import type { ChangeType } from "./change-type"
import {
  attributionOf,
  authorOf,
  type EntryAttribution,
} from "./entry-attribution"
import { parisDayOf } from "./paris-day"

export type AuditLogChange = {
  id: Snowflake
  date: Date
  memberName: string
  memberId: Snowflake | null
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

type WithoutAuthorLookup<Change> = Change extends unknown
  ? Omit<Change, "memberId" | "avatarUrl">
  : never

type FoundChange = {
  author: AccountIdentity
  account: AccountIdentity | null
  change: WithoutAuthorLookup<AuditLogChange>
  actionChange?: ActionChangeEntry
}

type Users = Map<Snowflake, APIUser>

type EventReader = {
  actionType: AuditLogEvent
  changeOf: (entry: APIAuditLogEntry, users: Users) => FoundChange | null
  retainedLimit: number
}

export type AuditLogDay = { date: Date; changes: AuditLogChange[] }

export type AuditLogPage = AuditLogFilters & {
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

const ENTRIES_PER_RULE_CHANGE = 2

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

const CURSOR = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)
  .nullable()
  .catch(null)

export async function readAuditLog(
  discord: DiscordApi,
  searchParams: {
    before?: unknown
    type?: unknown
    author?: unknown
    account?: unknown
  }
): Promise<AuditLogPage> {
  const cursor = CURSOR.parse(searchParams.before)
  const filters = auditLogFiltersOf(searchParams)
  const retains = retainerOf(filters)
  const found: FoundChange[] = []
  for (const reader of await eventReadersOf(discord, filters)) {
    found.push(...(await changesOfEvent(discord, reader, cursor, retains)))
  }
  const joined = joinActionChanges(found, withDescription)
  const pageChanges = joined.toSorted(newestFirst).slice(0, CHANGES_PER_PAGE)
  const avatarUrls = await avatarUrlsByMemberId(
    discord,
    pageChanges.map(({ author }) => author.id)
  )
  return {
    ...filters,
    days: byParisDay(
      pageChanges.map(({ author, change }) => ({
        ...change,
        memberId: author.id,
        avatarUrl:
          author.id === null ? null : (avatarUrls.get(author.id) ?? null),
      }))
    ),
    before: cursor,
    older:
      joined.length > CHANGES_PER_PAGE
        ? (pageChanges.at(-1)?.change.id ?? null)
        : null,
  }
}

function retainerOf({ author, account }: AuditLogFilters) {
  const authorMatches = identityMatcher(author)
  const accountMatches = identityMatcher(account)
  return (found: FoundChange) =>
    authorMatches(found.author) && accountMatches(found.account)
}

function eventsOf(type: ChangeType | null, account: string | null) {
  const events =
    type === null ? Object.values(EVENTS_OF_TYPE).flat() : EVENTS_OF_TYPE[type]
  return account === null
    ? events
    : events.filter((event) => !AUTO_MOD_RULE_EVENTS.includes(event))
}

async function eventReadersOf(
  discord: DiscordApi,
  { type, account }: AuditLogFilters
) {
  const events = eventsOf(type, account)
  if (events.length === 0) {
    return []
  }
  const [ruleActions, application] = await Promise.all([
    events.some((event) => AUTO_MOD_RULE_EVENTS.includes(event))
      ? panelRuleActions(discord)
      : null,
    discord.getApplicationUser(),
  ])
  return eventReaders(ruleActions, application.id).filter(({ actionType }) =>
    events.includes(actionType)
  )
}

async function panelRuleActions(discord: DiscordApi) {
  return new Map(
    panelRulesOf(await discord.listAutoModerationRules()).map(
      ({ rule, action }) => [rule.id, action] as const
    )
  )
}

function eventReaders(
  ruleActions: ReadonlyMap<Snowflake, BlockedWordAction> | null,
  applicationId: Snowflake
): EventReader[] {
  const sanctionReaders = STAFF_SANCTION_EVENTS.map((event) => ({
    actionType: event.actionType,
    changeOf: (entry: APIAuditLogEntry, users: Users) =>
      sanctionChangeOf(entry, event.changeOf(entry), users, applicationId),
    retainedLimit: CHANGES_PER_PAGE,
  }))
  if (ruleActions === null || ruleActions.size === 0) {
    return sanctionReaders
  }
  const ruleReaders = AUTO_MOD_RULE_EVENTS.map((actionType) => ({
    actionType,
    changeOf: (entry: APIAuditLogEntry, users: Users) => {
      const ruleAction =
        entry.target_id === null ? undefined : ruleActions.get(entry.target_id)
      return ruleAction === undefined
        ? null
        : ruleChangeOf(entry, users, applicationId, ruleAction)
    },
    retainedLimit: CHANGES_PER_PAGE * ENTRIES_PER_RULE_CHANGE,
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
  { actionType, changeOf, retainedLimit }: EventReader,
  olderThan: Snowflake | null,
  retains: (found: FoundChange) => boolean
) {
  const changes: FoundChange[] = []
  for await (const log of auditLogPages(discord, actionType, olderThan)) {
    const users = new Map(log.users.map((user) => [user.id, user]))
    for (const entry of log.audit_log_entries) {
      const change = changeOf(entry, users)
      if (change !== null && retains(change)) {
        changes.push(change)
      }
    }
    if (changes.length > retainedLimit) {
      break
    }
  }
  return changes
}

function ruleChangeOf(
  entry: APIAuditLogEntry,
  users: Users,
  applicationId: Snowflake,
  ruleAction: BlockedWordAction
): FoundChange {
  const attribution = attributionOf(entry, users, applicationId)
  const actionChange =
    attribution.kind === "panel"
      ? actionChangeEntryOf(attribution.reason, ruleAction)
      : null
  return {
    author: authorOf(attribution),
    account: null,
    change: {
      kind: "rule",
      ...momentOf(entry, attribution),
      madeInDiscord: attribution.kind === "discord",
      description: describedRuleChange(attribution, actionChange),
    },
    ...(actionChange !== null && { actionChange }),
  }
}

function withDescription(found: FoundChange, description: string) {
  return found.change.kind === "rule"
    ? { ...found, change: { ...found.change, description } }
    : found
}

function describedRuleChange(
  attribution: EntryAttribution,
  actionChange: ActionChangeEntry | null
) {
  if (attribution.kind === "discord") {
    return "Règle modifiée dans Discord"
  }
  return actionChange === null
    ? capitalized(attribution.reason)
    : actionChange.alone
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
  const attribution = attributionOf(entry, users, applicationId)
  const targeted = users.get(entry.target_id)
  const account = {
    id: entry.target_id,
    name: targeted === undefined ? null : userName(targeted),
  }
  return {
    author: authorOf(attribution),
    account,
    change: {
      kind: "sanction-change",
      ...momentOf(entry, attribution),
      sanctionChange,
      account: { id: account.id, name: account.name ?? "Compte inconnu" },
      reason: attribution.reason,
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
