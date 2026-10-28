import "server-only"

import {
  RESTJSONErrorCodes,
  type APIAuditLog,
  type APIAutoModerationRule,
  type APIBan,
  type APIDMChannel,
  type APIGuild,
  type APIGuildMember,
  type APIMessage,
  type APIRole,
  type APIUser,
  type RESTGetAPIAuditLogQuery,
  type RESTGetAPIGuildBansQuery,
  type RESTGetAPIGuildMembersSearchQuery,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPatchAPIGuildMemberJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type RESTPostAPIChannelMessageJSONBody,
  type Snowflake,
} from "discord-api-types/v10"

import { DiscordError, type HttpMethod } from "./discord-error"
import { parseDiscordApiEnv, type DiscordApiEnv } from "./env"
import {
  API_BASE,
  requestDiscord,
  requestDiscordJson,
  type DiscordRequest,
  type Fetch,
} from "./rest"
import { fillRoute, ROUTES, type DiscordRoute } from "./routes"

export type DiscordApi = {
  readonly guildId: Snowflake
  getGuild(): Promise<Guild>
  getApplicationUser(): Promise<APIUser>
  getMember(userId: Snowflake): Promise<APIGuildMember | null>
  modifyMember(
    userId: Snowflake,
    changes: MemberChanges,
    reason: string
  ): Promise<APIGuildMember>
  removeMember(userId: Snowflake, reason: string): Promise<void>
  createDm(recipientId: Snowflake): Promise<DmChannel>
  createMessage(channelId: Snowflake, message: MessageBody): Promise<Message>
  listAutoModerationRules(): Promise<APIAutoModerationRule[]>
  createAutoModerationRule(
    rule: RESTPostAPIAutoModerationRuleJSONBody,
    reason: string
  ): Promise<APIAutoModerationRule>
  modifyAutoModerationRule(
    ruleId: Snowflake,
    changes: RESTPatchAPIAutoModerationRuleJSONBody,
    reason: string
  ): Promise<APIAutoModerationRule>
  getAuditLog(query: RESTGetAPIAuditLogQuery): Promise<APIAuditLog>
  searchMembers(
    query: RESTGetAPIGuildMembersSearchQuery
  ): Promise<APIGuildMember[]>
  getUser(userId: Snowflake): Promise<APIUser | null>
  getBan(userId: Snowflake): Promise<APIBan | null>
  listBans(query: BansQuery): Promise<APIBan[]>
  listRoles(): Promise<APIRole[]>
}

export type BansQuery = Pick<RESTGetAPIGuildBansQuery, "after" | "limit">

export type Guild = Pick<APIGuild, "id" | "owner_id" | "roles">

export type MemberChanges = Pick<
  RESTPatchAPIGuildMemberJSONBody,
  "communication_disabled_until"
>

export type DmChannel = Pick<APIDMChannel, "id" | "type">

export type MessageBody = Pick<
  RESTPostAPIChannelMessageJSONBody,
  "content" | "allowed_mentions"
>

export type Message = Pick<APIMessage, "id" | "channel_id" | "content">

export function createDiscordApi(): DiscordApi {
  return restDiscordApi(parseDiscordApiEnv(process.env), globalThis.fetch)
}

type Call = {
  method: HttpMethod
  route: DiscordRoute
  params?: Record<string, string>
  query?: Record<string, string | number | undefined>
  body?: object
  reason?: string
}

export function restDiscordApi(env: DiscordApiEnv, fetch: Fetch): DiscordApi {
  function discordRequest({
    method,
    route,
    params,
    query,
    body,
    reason,
  }: Call): DiscordRequest {
    const url = new URL(
      API_BASE + fillRoute(route, { "guild.id": env.guildId, ...params })
    )
    for (const [name, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value))
      }
    }
    return {
      method,
      route,
      url: url.href,
      headers: {
        Authorization: `Bot ${env.botToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(reason === undefined
          ? {}
          : { "X-Audit-Log-Reason": encodeURIComponent(reason) }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  }

  async function call<T>(request: Call) {
    return await requestDiscordJson<T>(fetch, discordRequest(request))
  }

  return {
    guildId: env.guildId,

    async getGuild() {
      return await call<APIGuild>({ method: "GET", route: ROUTES.guild })
    },

    async getApplicationUser() {
      return await call<APIUser>({ method: "GET", route: ROUTES.currentUser })
    },

    async getMember(userId) {
      return await nullWhen(
        RESTJSONErrorCodes.UnknownMember,
        call<APIGuildMember>({
          method: "GET",
          route: ROUTES.guildMember,
          params: { "user.id": userId },
        })
      )
    },

    async modifyMember(userId, changes, reason) {
      return await call<APIGuildMember>({
        method: "PATCH",
        route: ROUTES.guildMember,
        params: { "user.id": userId },
        body: changes,
        reason,
      })
    },

    async removeMember(userId, reason) {
      await requestDiscord(
        fetch,
        discordRequest({
          method: "DELETE",
          route: ROUTES.guildMember,
          params: { "user.id": userId },
          reason,
        })
      )
    },

    async createDm(recipientId) {
      return await call<APIDMChannel>({
        method: "POST",
        route: ROUTES.currentUserChannels,
        body: { recipient_id: recipientId },
      })
    },

    async createMessage(channelId, message) {
      return await call<APIMessage>({
        method: "POST",
        route: ROUTES.channelMessages,
        params: { "channel.id": channelId },
        body: message,
      })
    },

    async listAutoModerationRules() {
      return await call<APIAutoModerationRule[]>({
        method: "GET",
        route: ROUTES.autoModerationRules,
      })
    },

    async createAutoModerationRule(rule, reason) {
      return await call<APIAutoModerationRule>({
        method: "POST",
        route: ROUTES.autoModerationRules,
        body: rule,
        reason,
      })
    },

    async modifyAutoModerationRule(ruleId, changes, reason) {
      return await call<APIAutoModerationRule>({
        method: "PATCH",
        route: ROUTES.autoModerationRule,
        params: { "auto_moderation_rule.id": ruleId },
        body: changes,
        reason,
      })
    },

    async getAuditLog(query) {
      return await call<APIAuditLog>({
        method: "GET",
        route: ROUTES.guildAuditLog,
        query: { ...query },
      })
    },

    async searchMembers(query) {
      return await call<APIGuildMember[]>({
        method: "GET",
        route: ROUTES.guildMembersSearch,
        query: { ...query },
      })
    },

    async getUser(userId) {
      return await nullWhen(
        RESTJSONErrorCodes.UnknownUser,
        call<APIUser>({
          method: "GET",
          route: ROUTES.user,
          params: { "user.id": userId },
        })
      )
    },

    async getBan(userId) {
      return await nullWhen(
        RESTJSONErrorCodes.UnknownBan,
        call<APIBan>({
          method: "GET",
          route: ROUTES.guildBan,
          params: { "user.id": userId },
        })
      )
    },

    async listBans(query) {
      return await call<APIBan[]>({
        method: "GET",
        route: ROUTES.guildBans,
        query: { ...query },
      })
    },

    async listRoles() {
      return await call<APIRole[]>({
        method: "GET",
        route: ROUTES.guildRoles,
      })
    },
  }
}

async function nullWhen<T>(code: RESTJSONErrorCodes, answer: Promise<T>) {
  try {
    return await answer
  } catch (error) {
    if (error instanceof DiscordError && error.code === code) {
      return null
    }
    throw error
  }
}
