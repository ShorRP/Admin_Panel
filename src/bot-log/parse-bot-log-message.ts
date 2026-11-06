import type { Snowflake } from "discord-api-types/v10"

import type { ChannelMessage } from "@/discord/discord-api"
import { mainEmbedOf, rawMessageOf } from "@/discord/message-texts"
import { snowflakeDate } from "@/discord/snowflake-date"
import type { LogRawField } from "@/ui/log-detail"
import {
  BOT_LOG_FAMILIES,
  familyKeyOfLabel,
  type BotLogFamilyKey,
} from "./bot-log-families"

export type BotLogReference = {
  kind: "account" | "role" | "channel"
  id: Snowflake
  name: string | null
}

export type BotLogValuePart = { kind: "text"; text: string } | BotLogReference

export type BotLogField = { name: string; parts: BotLogValuePart[] }

type LineOrigin = { messageId: Snowflake; channelId: Snowflake; date: Date }

export type BotLogEvent = LineOrigin & {
  kind: "event"
  family: BotLogFamilyKey
  action: string
  fields: BotLogField[]
  extra: LogRawField[]
}

export type BotLogRawLine = LineOrigin & {
  kind: "raw"
  title: string | null
  fields: LogRawField[]
}

export type BotLogEntry = BotLogEvent | BotLogRawLine

const TITLE = /^(.+?) · (.+)$/

const REFERENCE = /<(@&|@!?|#)(\d{17,20})>(?: \(`\2`\))?/g

const REFERENCE_KINDS: Record<string, BotLogReference["kind"]> = {
  "@": "account",
  "@!": "account",
  "@&": "role",
  "#": "channel",
}

export function parseBotLogMessage(message: ChannelMessage): BotLogEntry {
  const [embed] = message.embeds
  const origin = {
    messageId: message.id,
    channelId: message.channel_id,
    date: timeOf(message, mainEmbedOf(message)?.timestamp),
  }
  const title = TITLE.exec(embed?.title ?? "")
  const family = title === null ? null : familyKeyOfLabel(title[1] ?? "")
  const action = (title?.[2] ?? "").trim()
  if (
    embed === undefined ||
    message.embeds.length !== 1 ||
    message.content.trim() !== "" ||
    family === null ||
    !BOT_LOG_FAMILIES[family].actions.includes(action)
  ) {
    return { kind: "raw", ...origin, ...rawMessageOf(message) }
  }
  return {
    kind: "event",
    ...origin,
    family,
    action,
    fields: (embed.fields ?? []).map(({ name, value }) => ({
      name,
      parts: partsOf(value),
    })),
    extra: [embed.author?.name, embed.description].flatMap((text) =>
      text === undefined || text.trim() === ""
        ? []
        : [{ name: null, value: text }]
    ),
  }
}

function timeOf(message: ChannelMessage, timestamp: string | undefined) {
  const moment = timestamp === undefined ? Number.NaN : Date.parse(timestamp)
  return Number.isNaN(moment) ? snowflakeDate(message.id) : new Date(moment)
}

function partsOf(value: string): BotLogValuePart[] {
  const parts: BotLogValuePart[] = []
  let end = 0
  for (const match of value.matchAll(REFERENCE)) {
    const kind = REFERENCE_KINDS[match[1] ?? ""]
    const id = match[2]
    if (kind === undefined || id === undefined) {
      continue
    }
    if (match.index > end) {
      parts.push({ kind: "text", text: value.slice(end, match.index) })
    }
    parts.push({ kind, id, name: null })
    end = match.index + match[0].length
  }
  if (end < value.length) {
    parts.push({ kind: "text", text: value.slice(end) })
  }
  return parts
}
