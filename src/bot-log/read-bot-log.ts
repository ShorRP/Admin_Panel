import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import { compareIds } from "@/discord/compare-ids"
import type {
  ChannelMessage,
  DiscordApi,
  Guild,
  GuildChannel,
} from "@/discord/discord-api"
import { MAX_SEARCHES, SEARCH_PAGE_SIZE } from "@/discord/message-search-limits"
import { messageTextsOf } from "@/discord/message-texts"
import { searchBounds, type PeriodBounds } from "@/discord/period-bounds"
import { holdsWords, longestTermOf } from "@/discord/search-words"
import { accountNames } from "@/records/account-names"
import { resolveAccounts } from "@/records/resolve-accounts"
import { groupByParisDay, type DayGroup } from "@/ui/group-by-paris-day"
import { parisPeriodOf } from "@/ui/paris-day-bounds"
import { BOT_LOG_FAMILIES } from "./bot-log-families"
import {
  botLogFiltersOf,
  cursorOf,
  type BotLogFilters,
  type BotLogSearchParams,
} from "./bot-log-filters"
import {
  parseBotLogMessage,
  type BotLogEntry,
  type BotLogEvent,
  type BotLogField,
} from "./parse-bot-log-message"
import { resolveChannel } from "./resolve-channel"

export type BotLogConfig = { channelId: Snowflake }

export type BotLogDirectory = {
  roles: Guild["roles"]
  channels: readonly GuildChannel[]
}

export type BotLogNotice = {
  filter: "account" | "channel"
  text: string
  kind: "none" | "several"
}

export type BotLogPage = BotLogFilters & {
  days: DayGroup<BotLogEntry>[]
  before: Snowflake | null
  older: Snowflake | null
  cut: boolean
  notice: BotLogNotice | null
}

type FilterIds = { accountId: Snowflake | null; channelId: Snowflake | null }

type Scan = {
  discord: DiscordApi
  channelId: Snowflake
  applicationId: Snowflake
  filters: BotLogFilters
  ids: FilterIds
  served: string | undefined
  before: Snowflake | null
}

export async function readBotLog(
  discord: DiscordApi,
  { channelId }: BotLogConfig,
  directory: BotLogDirectory,
  searchParams: BotLogSearchParams
): Promise<BotLogPage> {
  const filters = botLogFiltersOf(searchParams)
  const before = cursorOf(searchParams)
  const nothing = {
    ...filters,
    days: [],
    before,
    older: null,
    cut: false,
    notice: null,
  }
  if (searchBounds(parisPeriodOf(filters), before) === null) {
    return nothing
  }
  const resolved = await resolveIds(discord, filters, directory.channels)
  if ("notice" in resolved) {
    return { ...nothing, notice: resolved.notice }
  }
  const { id: applicationId } = await discord.getApplicationUser()
  const { entries, older, cut } = await scan({
    discord,
    channelId,
    applicationId,
    filters,
    ids: resolved.ids,
    served: servedTermOf(filters, resolved.ids),
    before,
  })
  return {
    ...nothing,
    days: groupByParisDay(await withNames(discord, directory, entries)),
    older,
    cut,
  }
}

async function resolveIds(
  discord: DiscordApi,
  filters: BotLogFilters,
  channels: readonly GuildChannel[]
): Promise<{ ids: FilterIds } | { notice: BotLogNotice }> {
  let accountId: Snowflake | null = null
  if (filters.account !== null) {
    const account = (await resolveAccounts(discord, [filters.account])).get(
      filters.account
    )
    if (account?.kind !== "account") {
      return {
        notice: {
          filter: "account",
          text: filters.account,
          kind: account?.kind === "several" ? "several" : "none",
        },
      }
    }
    accountId = account.id
  }
  let channelId: Snowflake | null = null
  if (filters.channel !== null) {
    const channel = resolveChannel(filters.channel, channels)
    if (channel.kind !== "channel") {
      return {
        notice: {
          filter: "channel",
          text: filters.channel,
          kind: channel.kind,
        },
      }
    }
    channelId = channel.id
  }
  return { ids: { accountId, channelId } }
}

function servedTermOf(
  { family, action, text }: BotLogFilters,
  { accountId, channelId }: FilterIds
) {
  return (
    accountId ??
    channelId ??
    (text === null ? undefined : longestTermOf(text)) ??
    (action === null ? undefined : longestTermOf(action)) ??
    (family === null
      ? undefined
      : longestTermOf(BOT_LOG_FAMILIES[family].label))
  )
}

async function scan(context: Scan) {
  const { discord, channelId, applicationId, filters, served } = context
  const period = parisPeriodOf(filters)
  const entries: BotLogEntry[] = []
  let cursor = context.before
  for (let search = 0; search < MAX_SEARCHES; search++) {
    const bounds = searchBounds(period, cursor)
    if (bounds === null) {
      return { entries, older: null, cut: false }
    }
    const { messages } = await discord.searchMessages(
      queryOf(channelId, applicationId, served, bounds)
    )
    const newestFirst = messages.toSorted((left, right) =>
      compareIds(right.id, left.id)
    )
    for (const message of newestFirst) {
      const entry = keptEntry(context, message)
      if (entry === null) {
        continue
      }
      entries.push(entry)
      if (entries.length === SEARCH_PAGE_SIZE) {
        return { entries, older: entry.messageId, cut: false }
      }
    }
    if (messages.length < SEARCH_PAGE_SIZE) {
      return { entries, older: null, cut: false }
    }
    cursor = newestFirst.at(-1)?.id ?? cursor
  }
  return { entries, older: cursor, cut: true }
}

function queryOf(
  channelId: Snowflake,
  applicationId: Snowflake,
  served: string | undefined,
  { minId, maxId }: PeriodBounds
) {
  return {
    channel_id: [channelId],
    author_id: [applicationId],
    ...(served === undefined ? {} : { content: served }),
    ...(minId === undefined ? {} : { min_id: minId }),
    ...(maxId === undefined ? {} : { max_id: maxId }),
    sort_order: "desc" as const,
    limit: SEARCH_PAGE_SIZE,
    offset: 0,
  }
}

function keptEntry(
  { channelId, applicationId, filters, ids }: Scan,
  message: ChannelMessage
) {
  if (message.author.id !== applicationId || message.channel_id !== channelId) {
    return null
  }
  const entry = parseBotLogMessage(message)
  const texts = messageTextsOf(message)
  const holds = (words: string | null) =>
    words === null || texts.some((text) => holdsWords(text, words))
  const kept =
    (filters.family === null ||
      (entry.kind === "event" && entry.family === filters.family)) &&
    (filters.action === null ||
      (entry.kind === "event" && holdsWords(entry.action, filters.action))) &&
    holds(ids.accountId) &&
    holds(ids.channelId) &&
    holds(filters.text)
  return kept ? entry : null
}

async function withNames(
  discord: DiscordApi,
  { roles, channels }: BotLogDirectory,
  entries: BotLogEntry[]
): Promise<BotLogEntry[]> {
  const accounts = await accountNames(
    discord,
    entries.flatMap((entry) =>
      entry.kind === "event"
        ? entry.fields.flatMap(({ parts }) =>
            parts.flatMap((part) => (part.kind === "account" ? [part.id] : []))
          )
        : []
    )
  )
  const nameOf = (kind: "account" | "role" | "channel", id: Snowflake) =>
    kind === "account"
      ? (accounts.get(id) ?? null)
      : kind === "role"
        ? (roles.find((role) => role.id === id)?.name ?? null)
        : (channels.find((channel) => channel.id === id)?.name ?? null)
  return entries.map((entry): BotLogEntry => {
    if (entry.kind === "raw") {
      return entry
    }
    const fields = entry.fields.map(({ name, parts }): BotLogField => ({
      name,
      parts: parts.map((part) =>
        part.kind === "text"
          ? part
          : { ...part, name: nameOf(part.kind, part.id) }
      ),
    }))
    return { ...entry, fields } satisfies BotLogEvent
  })
}
