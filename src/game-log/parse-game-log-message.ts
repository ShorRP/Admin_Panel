import type { APIEmbed, Snowflake } from "discord-api-types/v10"

import type { ChannelMessage } from "@/discord/discord-api"
import { snowflakeDate } from "@/discord/snowflake-date"

export type GameLogRawField = { name: string | null; value: string }

type LineOrigin = { messageId: Snowflake; channelId: Snowflake; date: Date }

export type GameLogEvent = LineOrigin & {
  kind: "event"
  category: string
  action: string
  character: string | null
  gameAccount: string | null
  target: string | null
  reason: string | null
  place: string | null
  eventId: string | null
}

export type GameLogRawLine = LineOrigin & {
  kind: "raw"
  title: string | null
  fields: GameLogRawField[]
}

export type GameLogEntry = GameLogEvent | GameLogRawLine

const TITLE = /^(.+?)\s+·\s+([\s\S]+)$/

const CHARACTER_AND_ACCOUNT = /^(?:(.+?)\s*·\s*)?compte\s+(\d+)$/i

const LABELLED_LINE = /^\**\s*([^:*]+?)\s*\**\s*:\s*(.+)$/

const FOOTER_IDENTIFIER = /·\s*([^\s·]+)\s*$/

const MARKUP = /^[*`\s]+|[*`\s]+$/g

export function parseGameLogMessage(message: ChannelMessage): GameLogEntry {
  const origin = {
    messageId: message.id,
    channelId: message.channel_id,
    date: snowflakeDate(message.id),
  }
  const embed =
    message.embeds.find(({ title }) => title !== undefined) ?? message.embeds[0]
  if (embed === undefined) {
    const content = message.content.trim()
    return {
      kind: "raw",
      ...origin,
      title: content === "" ? null : content,
      fields: [],
    }
  }
  const title = TITLE.exec(embed.title ?? "")
  if (title === null) {
    return {
      kind: "raw",
      ...origin,
      title: embed.title ?? null,
      fields: rawFieldsOf(message.content, embed),
    }
  }
  const labelled = labelledValuesOf(embed)
  const identity = characterAndAccountOf(embed)
  return {
    kind: "event",
    ...origin,
    category: (title[1] ?? "").trim(),
    action: (title[2] ?? "").trim(),
    character: identity.character,
    gameAccount: identity.gameAccount,
    target: labelled.get("cible") ?? null,
    reason: labelled.get("motif") ?? null,
    place: labelled.get("lieu") ?? null,
    eventId: identifierOf(embed.footer?.text),
  }
}

function rawFieldsOf(content: string, embed: APIEmbed): GameLogRawField[] {
  return [
    ...(content.trim() === "" ? [] : [{ name: null, value: content }]),
    ...(embed.description === undefined
      ? []
      : [{ name: null, value: embed.description }]),
    ...(embed.fields ?? []).map(({ name, value }) => ({ name, value })),
    ...(embed.footer === undefined
      ? []
      : [{ name: null, value: embed.footer.text }]),
  ]
}

function plain(text: string) {
  const stripped = text.replace(MARKUP, "")
  return stripped === "" ? null : stripped
}

function descriptionLinesOf({ description }: APIEmbed) {
  return (description ?? "").split(/\r?\n/)
}

function labelledValuesOf(embed: APIEmbed) {
  const values = new Map<string, string>()
  const add = (label: string, value: string) => {
    const key = plain(label)?.toLowerCase().replace(/\s*:$/, "")
    const text = plain(value)
    if (key !== undefined && text !== null && !values.has(key)) {
      values.set(key, text)
    }
  }
  for (const { name, value } of embed.fields ?? []) {
    add(name, value)
  }
  for (const line of descriptionLinesOf(embed)) {
    const labelled = LABELLED_LINE.exec(line)
    if (labelled !== null) {
      add(labelled[1] ?? "", labelled[2] ?? "")
    }
  }
  return values
}

function characterAndAccountOf(embed: APIEmbed) {
  const candidates = [
    embed.author?.name,
    ...descriptionLinesOf(embed),
    ...(embed.fields ?? []).flatMap(({ name, value }) => [name, value]),
  ]
  for (const candidate of candidates) {
    const found = CHARACTER_AND_ACCOUNT.exec(plain(candidate ?? "") ?? "")
    if (found !== null) {
      return {
        character: plain(found[1] ?? ""),
        gameAccount: found[2] ?? null,
      }
    }
  }
  return { character: null, gameAccount: null }
}

function identifierOf(footer: string | undefined) {
  return footer === undefined
    ? null
    : (FOOTER_IDENTIFIER.exec(footer)?.[1] ?? null)
}
