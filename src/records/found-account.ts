import type { APIBan, APIGuildMember, Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { memberAvatarUrl, userAvatarUrl } from "@/discord/member-avatar-url"
import { memberName, userName } from "@/discord/member-name"
import type { AccountStanding } from "./account-standing"
import type { HighestRole } from "./role-hierarchy"
import { timeoutEndOf } from "./timeout-end"

export type FoundAccount = {
  id: Snowflake
  name: string
  username: string
  avatarUrl: string | null
  standing: AccountStanding
  highestRole: HighestRole | null
}

export function foundMember(
  discord: DiscordApi,
  member: APIGuildMember,
  highestRole: HighestRole | null
): FoundAccount {
  return {
    id: member.user.id,
    name: memberName(member),
    username: member.user.username,
    avatarUrl: memberAvatarUrl(discord.guildId, member),
    standing: {
      kind: "member",
      timedOutUntil: timeoutEndOf(member.communication_disabled_until),
    },
    highestRole,
  }
}

export function foundBan({ user }: APIBan): FoundAccount {
  return {
    id: user.id,
    name: userName(user),
    username: user.username,
    avatarUrl: userAvatarUrl(user),
    standing: { kind: "banned" },
    highestRole: null,
  }
}
