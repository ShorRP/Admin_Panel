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
  extra: GameLogRawField[]
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

const LABELS = new Set(["cible", "motif", "lieu"])

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
  const others = message.embeds.filter((candidate) => candidate !== embed)
  const title = TITLE.exec(embed.title ?? "")
  if (title === null) {
    return {
      kind: "raw",
      ...origin,
      title: embed.title ?? null,
      fields: [
        ...contentFieldOf(message.content),
        ...textsOf(embed),
        ...others.flatMap(withTitle),
      ],
    }
  }
  return {
    kind: "event",
    ...origin,
    category: (title[1] ?? "").trim(),
    action: (title[2] ?? "").trim(),
    ...readEvent(message.content, embed, others),
  }
}

function readEvent(content: string, embed: APIEmbed, others: APIEmbed[]) {
  const lines = (embed.description ?? "").split(/\r?\n/)
  const fields = embed.fields ?? []
  const authorName = embed.author?.name
  const claimedLines = new Set<number>()
  const fieldsLeft = fields.map(({ name, value }): GameLogRawField[] => [
    { name, value },
  ])

  let character: string | null = null
  let gameAccount: string | null = null
  let identified = false
  const identify = (text: string | undefined, named: string | null = null) => {
    if (identified || text === undefined) {
      return false
    }
    const found = CHARACTER_AND_ACCOUNT.exec(plain(text) ?? "")
    if (found === null) {
      return false
    }
    character = plain(found[1] ?? "") ?? named
    gameAccount = found[2] ?? null
    identified = true
    return true
  }
  fields.forEach(({ name, value }, index) => {
    const [first = "", ...rest] = value.split(/\r?\n/)
    if (identify(first, plain(name))) {
      fieldsLeft[index] = rest
        .filter((line) => line.trim() !== "")
        .map((line): GameLogRawField => ({ name: null, value: line }))
    } else if (identify(name)) {
      fieldsLeft[index] = []
    }
  })
  const authorClaimed = identify(authorName)
  lines.forEach((line, index) => {
    if (identify(line)) {
      claimedLines.add(index)
    }
  })

  const labelled = new Map<string, string>()
  const take = (label: string, value: string) => {
    const key = labelOf(label)
    const text = plain(value)
    if (
      key === undefined ||
      !LABELS.has(key) ||
      text === null ||
      labelled.has(key)
    ) {
      return false
    }
    labelled.set(key, text)
    return true
  }
  const takeLine = (line: string) => {
    const found = LABELLED_LINE.exec(line)
    return found !== null && take(found[1] ?? "", found[2] ?? "")
  }
  const unreadFields = fieldsLeft.map((left) => {
    const unread: GameLogRawField[] = []
    for (const piece of left) {
      const taken =
        piece.name === null
          ? takeLine(piece.value)
          : take(piece.name, piece.value)
      if (!taken) {
        unread.push(piece)
      }
    }
    return unread
  })
  lines.forEach((line, index) => {
    if (!claimedLines.has(index) && takeLine(line)) {
      claimedLines.add(index)
    }
  })

  const eventId = identifierOf(embed.footer?.text)
  return {
    character,
    gameAccount,
    target: labelled.get("cible") ?? null,
    reason: labelled.get("motif") ?? null,
    place: labelled.get("lieu") ?? null,
    eventId,
    extra: [
      ...contentFieldOf(content),
      ...(authorName === undefined || authorClaimed
        ? []
        : [{ name: null, value: authorName }]),
      ...lines.flatMap((line, index) =>
        claimedLines.has(index) || line.trim() === ""
          ? []
          : [{ name: null, value: line }]
      ),
      ...unreadFields.flat(),
      ...(embed.footer === undefined || eventId !== null
        ? []
        : [{ name: null, value: embed.footer.text }]),
      ...others.flatMap(withTitle),
    ],
  }
}

function contentFieldOf(content: string): GameLogRawField[] {
  return content.trim() === "" ? [] : [{ name: null, value: content }]
}

function textsOf(embed: APIEmbed): GameLogRawField[] {
  return [
    ...(embed.author === undefined
      ? []
      : [{ name: null, value: embed.author.name }]),
    ...(embed.description === undefined
      ? []
      : [{ name: null, value: embed.description }]),
    ...(embed.fields ?? []).map(({ name, value }) => ({ name, value })),
    ...(embed.footer === undefined
      ? []
      : [{ name: null, value: embed.footer.text }]),
  ]
}

function withTitle(embed: APIEmbed): GameLogRawField[] {
  return [
    ...(embed.title === undefined ? [] : [{ name: null, value: embed.title }]),
    ...textsOf(embed),
  ]
}

function plain(text: string) {
  const stripped = text.replace(MARKUP, "")
  return stripped === "" ? null : stripped
}

function labelOf(label: string) {
  return plain(label)?.toLowerCase().replace(/\s*:$/, "")
}

function identifierOf(footer: string | undefined) {
  return footer === undefined
    ? null
    : (FOOTER_IDENTIFIER.exec(footer)?.[1] ?? null)
}
