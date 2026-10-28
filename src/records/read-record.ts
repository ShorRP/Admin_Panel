import "server-only"

import type {
  APIBan,
  APIGuildMember,
  APIUser,
  Snowflake,
} from "discord-api-types/v10"

import { panelReasonOf } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import { memberAvatarUrl, userAvatarUrl } from "@/discord/member-avatar-url"
import { userName } from "@/discord/member-name"
import { snowflakeDate } from "@/discord/snowflake-date"
import { ACCOUNT_ID } from "./account-id"

export type Standing =
  | {
      kind: "member"
      joinedAt: Date | null
      roles: { id: Snowflake; name: string }[]
      timedOutUntil: Date | null
    }
  | {
      kind: "banned"
      reason: string | null
      staffMemberName: string | null
    }
  | { kind: "absent" }

export type AccountRecord = {
  id: Snowflake
  name: string
  nick: string | null
  globalName: string | null
  username: string
  avatarUrl: string | null
  createdAt: Date
  standing: Standing
}

export async function readRecord(
  discord: DiscordApi,
  userIdParam: unknown
): Promise<AccountRecord | null> {
  const parsed = ACCOUNT_ID.safeParse(userIdParam)
  if (!parsed.success) {
    return null
  }
  const userId = parsed.data
  const member = await discord.getMember(userId)
  if (member !== null) {
    return {
      ...identityOf(
        member.user,
        member.nick ?? null,
        memberAvatarUrl(discord.guildId, member)
      ),
      standing: await memberStanding(discord, member),
    }
  }
  const ban = await discord.getBan(userId)
  if (ban !== null) {
    return {
      ...identityOf(ban.user, null, userAvatarUrl(ban.user)),
      standing: bannedStanding(ban),
    }
  }
  const user = await discord.getUser(userId)
  if (user !== null) {
    return {
      ...identityOf(user, null, userAvatarUrl(user)),
      standing: { kind: "absent" },
    }
  }
  return null
}

function identityOf(
  user: APIUser,
  nick: string | null,
  avatarUrl: string | null
) {
  return {
    id: user.id,
    name: nick ?? userName(user),
    nick,
    globalName: user.global_name,
    username: user.username,
    avatarUrl,
    createdAt: snowflakeDate(user.id),
  }
}

async function memberStanding(
  discord: DiscordApi,
  member: APIGuildMember
): Promise<Standing> {
  const roles = await discord.listRoles()
  return {
    kind: "member",
    joinedAt: member.joined_at === null ? null : new Date(member.joined_at),
    roles: roles
      .filter(({ id }) => member.roles.includes(id))
      .toSorted((left, right) => right.position - left.position)
      .map(({ id, name }) => ({ id, name })),
    timedOutUntil: timeoutEndOf(member.communication_disabled_until),
  }
}

function bannedStanding({ reason }: APIBan): Standing {
  const panelReason = reason === null ? null : panelReasonOf(reason)
  return {
    kind: "banned",
    reason: panelReason?.change ?? reason,
    staffMemberName: panelReason?.staffMemberName ?? null,
  }
}

function timeoutEndOf(communicationDisabledUntil: string | null | undefined) {
  if (
    communicationDisabledUntil === null ||
    communicationDisabledUntil === undefined
  ) {
    return null
  }
  const end = new Date(communicationDisabledUntil)
  return end.getTime() > Date.now() ? end : null
}
