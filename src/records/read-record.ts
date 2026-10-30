import "server-only"

import {
  AuditLogEvent,
  type APIBan,
  type APIGuildMember,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"

import { auditLogPages } from "@/audit-log/audit-log-pages"
import { attributionOf } from "@/audit-log/entry-attribution"
import type { DiscordApi } from "@/discord/discord-api"
import { memberAvatarUrl, userAvatarUrl } from "@/discord/member-avatar-url"
import { userName } from "@/discord/member-name"
import { snowflakeDate } from "@/discord/snowflake-date"
import { ACCOUNT_ID } from "./account-id"
import { timeoutEndOf } from "./timeout-end"

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
      standing: await bannedStanding(discord, ban),
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

async function bannedStanding(
  discord: DiscordApi,
  { user, reason }: APIBan
): Promise<Standing> {
  const found = await newestBanEntryOf(discord, user.id)
  if (found === null) {
    return { kind: "banned", reason, staffMemberName: null }
  }
  const { id: applicationId } = await discord.getApplicationUser()
  const attribution = attributionOf(found.entry, found.users, applicationId)
  return attribution.kind === "panel"
    ? {
        kind: "banned",
        reason: attribution.reason,
        staffMemberName: attribution.memberName,
      }
    : { kind: "banned", reason, staffMemberName: null }
}

async function newestBanEntryOf(discord: DiscordApi, accountId: Snowflake) {
  for await (const log of auditLogPages(
    discord,
    AuditLogEvent.MemberBanAdd,
    null
  )) {
    const entry = log.audit_log_entries.find(
      ({ target_id }) => target_id === accountId
    )
    if (entry !== undefined) {
      return { entry, users: new Map(log.users.map((user) => [user.id, user])) }
    }
  }
  return null
}
