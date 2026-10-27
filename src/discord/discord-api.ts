import "server-only"

import {
  RESTJSONErrorCodes,
  type APIAuditLog,
  type APIAutoModerationRule,
  type APIGuildMember,
  type RESTGetAPIAuditLogQuery,
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
}

export function createDiscordApi(): DiscordApi {
  return restDiscordApi(parseDiscordApiEnv(process.env), globalThis.fetch)
}

type Call = {
  method: HttpMethod
  route: DiscordRoute
  params?: Record<string, string>
  query?: RESTGetAPIAuditLogQuery
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
      try {
        return await call<APIGuildMember>({
          method: "GET",
          route: ROUTES.guildMember,
          params: { "user.id": userId },
        })
      } catch (error) {
        if (
          error instanceof DiscordError &&
          error.code === RESTJSONErrorCodes.UnknownMember
        ) {
          return null
        }
        throw error
      }
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
        query,
      })
    },
  }
}
