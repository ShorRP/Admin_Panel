import "server-only"

import {
  RESTJSONErrorCodes,
  type APIAuditLog,
  type APIAutoModerationRule,
  type APIBan,
  type APIGuildMember,
  type APIRole,
  type APIUser,
  type RESTGetAPIAuditLogQuery,
  type RESTGetAPIGuildBansQuery,
  type RESTGetAPIGuildMembersSearchQuery,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type Snowflake,
} from "discord-api-types/v10"

import { DiscordError, type HttpMethod } from "./discord-error"
import { parseDiscordApiEnv, type DiscordApiEnv } from "./env"
import { API_BASE, requestDiscordJson, type Fetch } from "./rest"
import { fillRoute, ROUTES, type DiscordRoute } from "./routes"

export type DiscordApi = {
  readonly guildId: Snowflake
  getMember(userId: Snowflake): Promise<APIGuildMember | null>
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
  async function call<T>({ method, route, params, query, body, reason }: Call) {
    const url = new URL(
      API_BASE + fillRoute(route, { "guild.id": env.guildId, ...params })
    )
    for (const [name, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value))
      }
    }
    return await requestDiscordJson<T>(fetch, {
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
    })
  }

  return {
    guildId: env.guildId,

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
