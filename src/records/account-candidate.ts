import type {
  APIBan,
  APIGuildMember,
  APIRole,
  APIUser,
  Snowflake,
} from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { snowflakeDate } from "@/discord/snowflake-date"
import { foundBan, foundMember, type FoundAccount } from "./found-account"
import { highestRoleOf, highestRoleRankOf } from "./role-hierarchy"

export type AccountCandidate = {
  account: FoundAccount
  names: string[]
  member: {
    roleIds: readonly Snowflake[]
    rank: number | null
    joinedAt: Date | null
  } | null
  createdAt: Date
  botAccount: boolean
}

export function memberCandidate(
  discord: DiscordApi,
  member: APIGuildMember,
  hierarchy: readonly Pick<APIRole, "id" | "name" | "colors">[]
): AccountCandidate {
  return {
    account: foundMember(
      discord,
      member,
      highestRoleOf(member.roles, hierarchy)
    ),
    names: lowerCaseNames(member.user, member.nick),
    member: {
      roleIds: member.roles,
      rank: highestRoleRankOf(member.roles, hierarchy),
      joinedAt: member.joined_at === null ? null : new Date(member.joined_at),
    },
    createdAt: snowflakeDate(member.user.id),
    botAccount: isBotAccount(member.user),
  }
}

export function banCandidate(ban: APIBan): AccountCandidate {
  return {
    account: foundBan(ban),
    names: lowerCaseNames(ban.user, null),
    member: null,
    createdAt: snowflakeDate(ban.user.id),
    botAccount: isBotAccount(ban.user),
  }
}

function isBotAccount({ bot }: Pick<APIUser, "bot">) {
  return bot === true
}

export function lowerCaseNames(
  { username, global_name }: Pick<APIUser, "username" | "global_name">,
  nick: string | null | undefined
) {
  return [username, global_name, nick].flatMap((name) =>
    name === null || name === undefined ? [] : [name.toLocaleLowerCase()]
  )
}
