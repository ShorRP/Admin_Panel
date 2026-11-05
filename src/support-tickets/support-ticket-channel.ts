import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type APIGuildChannel,
  type Snowflake,
} from "discord-api-types/v10"

const EVERYONE_ID = "1100000000000000000"

export function channelIdAt(moment: string): Snowflake {
  const sinceDiscordEpoch = BigInt(Date.parse(moment)) - BigInt(1420070400000)
  return (sinceDiscordEpoch * BigInt(4194304)).toString()
}

const VIEW = PermissionFlagsBits.ViewChannel

const SPEAK = PermissionFlagsBits.SendMessages

type SupportTicketChannel = {
  id: Snowflake
  categoryId: Snowflake
  openerId: Snowflake
  roleIds?: Snowflake[]
  emoji?: string
  pseudo?: string
  name?: string
}

export function supportTicketChannel({
  id,
  categoryId,
  openerId,
  roleIds = [],
  emoji = "🔧",
  pseudo = "lyra",
  name = `${emoji}・${pseudo}`,
}: SupportTicketChannel): Required<
  Pick<
    APIGuildChannel,
    "id" | "type" | "name" | "parent_id" | "permission_overwrites"
  >
> {
  return {
    id,
    type: ChannelType.GuildText,
    name,
    parent_id: categoryId,
    permission_overwrites: [
      {
        id: EVERYONE_ID,
        type: OverwriteType.Role,
        allow: "0",
        deny: VIEW.toString(),
      },
      {
        id: openerId,
        type: OverwriteType.Member,
        allow: (VIEW | SPEAK).toString(),
        deny: "0",
      },
      ...roleIds.map((roleId) => ({
        id: roleId,
        type: OverwriteType.Role,
        allow: (VIEW | SPEAK).toString(),
        deny: "0",
      })),
    ],
  }
}
