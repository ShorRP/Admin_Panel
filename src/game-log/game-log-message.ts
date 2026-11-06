import {
  OverwriteType,
  PermissionFlagsBits,
  type APIEmbed,
  type Snowflake,
} from "discord-api-types/v10"

type GameLogLine = {
  category?: string
  action?: string
  character?: string
  account?: string
  target?: string | null
  reason?: string
  place?: string
  hash?: string
}

export function gameLogEmbed({
  category = "Administration",
  action = "administration:heal",
  character = "Merida",
  account = "2094594320",
  target = "4278190080",
  reason,
  place = "3c:Skyrim.esm · 3816, -5303, -5681",
  hash = "189b92f6",
}: GameLogLine = {}): APIEmbed {
  return {
    title: `${category} · ${action}`,
    fields: [
      {
        name: character,
        value:
          target === null
            ? `compte ${account}`
            : `compte ${account}\nCible : ${target}`,
      },
      ...(reason === undefined ? [] : [{ name: "Motif", value: reason }]),
      { name: "Lieu", value: place },
    ],
    footer: { text: `Shor · ${hash}` },
  }
}

export function gameLogMessage({
  channelId,
  webhookId,
  sentAt,
  ...line
}: GameLogLine & {
  channelId: Snowflake
  webhookId: Snowflake
  sentAt?: Date
}) {
  return {
    channelId,
    authorId: webhookId,
    ...(sentAt === undefined ? {} : { sentAt }),
    embeds: [gameLogEmbed(line)],
  }
}

export function gameLogChannel({
  id,
  viewerRoleIds,
}: {
  id: Snowflake
  viewerRoleIds: Snowflake[]
}) {
  return {
    id,
    name: "🔧・log-jeux",
    permission_overwrites: viewerRoleIds.map((roleId) => ({
      id: roleId,
      type: OverwriteType.Role,
      allow: String(PermissionFlagsBits.ViewChannel),
      deny: "0",
    })),
  }
}
