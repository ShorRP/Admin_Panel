import type { APIEmbed } from "discord-api-types/v10"

import type { LogRawField } from "@/ui/log-detail"
import type { ChannelMessage } from "./discord-api"

export type RawMessage = { title: string | null; fields: LogRawField[] }

export function mainEmbedOf(message: Pick<ChannelMessage, "embeds">) {
  return (
    message.embeds.find(({ title }) => title !== undefined) ?? message.embeds[0]
  )
}

export function contentTextsOf(content: string): LogRawField[] {
  return content.trim() === "" ? [] : [{ name: null, value: content }]
}

export function embedTextsOf(embed: APIEmbed): LogRawField[] {
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

export function titledEmbedTextsOf(embed: APIEmbed): LogRawField[] {
  return [
    ...(embed.title === undefined ? [] : [{ name: null, value: embed.title }]),
    ...embedTextsOf(embed),
  ]
}

export function rawMessageOf(
  message: Pick<ChannelMessage, "content" | "embeds">
): RawMessage {
  const embed = mainEmbedOf(message)
  if (embed === undefined) {
    const content = message.content.trim()
    return { title: content === "" ? null : content, fields: [] }
  }
  return {
    title: embed.title ?? null,
    fields: [
      ...contentTextsOf(message.content),
      ...embedTextsOf(embed),
      ...message.embeds
        .filter((candidate) => candidate !== embed)
        .flatMap(titledEmbedTextsOf),
    ],
  }
}

export function messageTextsOf(
  message: Pick<ChannelMessage, "content" | "embeds">
): string[] {
  return [
    message.content,
    ...message.embeds.flatMap((embed) => [
      embed.title,
      ...embedTextsOf(embed).flatMap(({ name, value }) => [name, value]),
    ]),
  ].filter((text): text is string => typeof text === "string" && text !== "")
}
