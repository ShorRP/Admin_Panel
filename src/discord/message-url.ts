import type { Snowflake } from "discord-api-types/v10"

export function discordMessageUrl({
  guildId,
  channelId,
  messageId,
}: {
  guildId: Snowflake
  channelId: Snowflake
  messageId: Snowflake
}) {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
}
