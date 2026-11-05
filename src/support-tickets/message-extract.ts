import type { ChannelMessage } from "@/discord/discord-api"

const MAX_LENGTH = 160

const USER_MENTION = /<@!?(\d+)>/g

const ROLE_MENTION = /<@&(\d+)>/g

const CHANNEL_MENTION = /<#(\d+)>/g

const CUSTOM_EMOJI = /<a?:(\w+):\d+>/g

export type ExtractNames = {
  users: ReadonlyMap<string, string>
  roles: ReadonlyMap<string, string>
  channels: ReadonlyMap<string, string>
}

export function messageExtract(
  {
    content,
    author,
    embeds,
  }: Pick<ChannelMessage, "content" | "author" | "embeds">,
  names: ExtractNames
) {
  const texts = [
    content,
    ...(author.bot === true
      ? embeds.map(({ description }) => description ?? "")
      : []),
  ]
  const text = texts
    .join(" ")
    .replace(
      USER_MENTION,
      (_, id: string) => `@${names.users.get(id) ?? "membre"}`
    )
    .replace(
      ROLE_MENTION,
      (_, id: string) => `@${names.roles.get(id) ?? "rôle"}`
    )
    .replace(
      CHANNEL_MENTION,
      (_, id: string) => `#${names.channels.get(id) ?? "salon"}`
    )
    .replace(CUSTOM_EMOJI, (_, name: string) => `:${name}:`)
    .replace(/\s+/g, " ")
    .trim()
  const characters = Array.from(text)
  return characters.length <= MAX_LENGTH
    ? text
    : `${characters.slice(0, MAX_LENGTH - 1).join("")}…`
}
