import {
  OverwriteType,
  PermissionFlagsBits,
  type APIEmbed,
  type Snowflake,
} from "discord-api-types/v10"

import examples from "./bot-log-examples.json"

export type BotLogExampleName = keyof typeof examples

type Change = {
  ids?: Record<Snowflake, Snowflake>
  fields?: Record<string, string>
  timestamp?: string
  title?: string
}

function withIds(value: string, ids: Record<Snowflake, Snowflake>) {
  const from = Object.keys(ids)
  return from.length === 0
    ? value
    : value.replace(new RegExp(from.join("|"), "g"), (id) => ids[id] ?? id)
}

export function botLogEmbed(
  name: BotLogExampleName,
  { ids = {}, fields = {}, timestamp, title }: Change = {}
): APIEmbed {
  const example: APIEmbed = examples[name]
  return {
    ...example,
    ...(timestamp === undefined ? {} : { timestamp }),
    ...(title === undefined ? {} : { title }),
    fields: (example.fields ?? []).map((field) => ({
      ...field,
      value: withIds(fields[field.name] ?? field.value, ids),
    })),
  }
}

export function botLogMessage({
  example,
  channelId,
  authorId,
  sentAt,
  ...change
}: Change & {
  example: BotLogExampleName
  channelId: Snowflake
  authorId?: Snowflake
  sentAt?: Date
}) {
  return {
    channelId,
    ...(authorId === undefined ? {} : { authorId }),
    ...(sentAt === undefined ? {} : { sentAt }),
    embeds: [
      botLogEmbed(example, {
        ...change,
        ...(change.timestamp === undefined && sentAt !== undefined
          ? { timestamp: sentAt.toISOString() }
          : {}),
      }),
    ],
  }
}

export function botLogChannel({
  id,
  viewerRoleIds,
}: {
  id: Snowflake
  viewerRoleIds: Snowflake[]
}) {
  return {
    id,
    name: "🔧・log-admin",
    permission_overwrites: viewerRoleIds.map((roleId) => ({
      id: roleId,
      type: OverwriteType.Role,
      allow: String(PermissionFlagsBits.ViewChannel),
      deny: "0",
    })),
  }
}
