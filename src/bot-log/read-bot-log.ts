import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type {
  ChannelMessage,
  DiscordApi,
  Guild,
  GuildChannel,
} from "@/discord/discord-api"
import { messageTextsOf } from "@/discord/message-texts"
import { searchBounds } from "@/discord/period-bounds"
import { scanMessages } from "@/discord/scan-messages"
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

type KeepContext = {
  channelId: Snowflake
  applicationId: Snowflake
  filters: BotLogFilters
  ids: FilterIds
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
  const context = { channelId, applicationId, filters, ids: resolved.ids }
  const { entries, older, cut } = await scanMessages(discord, {
    channelId,
    authorId: applicationId,
    served: servedTermOf(filters, resolved.ids),
    period: parisPeriodOf(filters),
    before,
    keep: (message) => keptEntry(context, message),
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

function keptEntry(
  { channelId, applicationId, filters, ids }: KeepContext,
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
