import {
  RESTJSONErrorCodes,
  type RESTGetAPIAuditLogQuery,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type RESTPostAPICurrentUserCreateDMChannelJSONBody,
} from "discord-api-types/v10"

import type {
  BansQuery,
  DiscordApi,
  MemberChanges,
  MessageBody,
} from "./discord-api"
import { DiscordError, type HttpMethod } from "./discord-error"
import type { DiscordOAuth } from "./discord-oauth"
import { readJson } from "./read-json"
import type { Fetch } from "./rest"
import { ROUTES, type DiscordRoute } from "./routes"

type ParamLookup = (name: string) => string

type Endpoint = {
  method: HttpMethod
  route: DiscordRoute
  answer(request: Request, param: ParamLookup): Promise<unknown>
}

const DISCORD_ORIGIN = "https://discord.com"

const API_PATH = /^\/api(?:\/v\d+)?(\/.*)$/

const NOT_FOUND = { message: "404: Not Found", code: 0 }

export function httpAdapter(api: DiscordApi, oauth: DiscordOAuth): Fetch {
  const endpoints: Endpoint[] = [
    {
      method: "GET",
      route: ROUTES.guild,
      answer: () => api.getGuild(),
    },
    {
      method: "GET",
      route: ROUTES.guildMembersSearch,
      answer: (request) => {
        const search = new URL(request.url).searchParams
        const limit = search.get("limit")
        return api.searchMembers({
          query: search.get("query") ?? "",
          ...(limit === null ? {} : { limit: Number(limit) }),
        })
      },
    },
    {
      method: "GET",
      route: ROUTES.guildMember,
      answer: async (_, param) =>
        found(
          ROUTES.guildMember,
          await api.getMember(param("user.id")),
          RESTJSONErrorCodes.UnknownMember,
          "Unknown Member"
        ),
    },
    {
      method: "PATCH",
      route: ROUTES.guildMember,
      answer: async (request, param) =>
        await api.modifyMember(
          param("user.id"),
          await readJson<MemberChanges>(request),
          reasonOf(request)
        ),
    },
    {
      method: "GET",
      route: ROUTES.guildBans,
      answer: (request) =>
        api.listBans(bansQuery(new URL(request.url).searchParams)),
    },
    {
      method: "GET",
      route: ROUTES.guildBan,
      answer: async (_, param) =>
        found(
          ROUTES.guildBan,
          await api.getBan(param("user.id")),
          RESTJSONErrorCodes.UnknownBan,
          "Unknown Ban"
        ),
    },
    {
      method: "GET",
      route: ROUTES.guildRoles,
      answer: () => api.listRoles(),
    },
    {
      method: "GET",
      route: ROUTES.autoModerationRules,
      answer: () => api.listAutoModerationRules(),
    },
    {
      method: "POST",
      route: ROUTES.autoModerationRules,
      answer: async (request) =>
        await api.createAutoModerationRule(
          await readJson<RESTPostAPIAutoModerationRuleJSONBody>(request),
          reasonOf(request)
        ),
    },
    {
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      answer: async (request, param) =>
        await api.modifyAutoModerationRule(
          param("auto_moderation_rule.id"),
          await readJson<RESTPatchAPIAutoModerationRuleJSONBody>(request),
          reasonOf(request)
        ),
    },
    {
      method: "GET",
      route: ROUTES.guildAuditLog,
      answer: (request) =>
        api.getAuditLog(auditLogQuery(new URL(request.url).searchParams)),
    },
    {
      method: "POST",
      route: ROUTES.oauth2Token,
      answer: async (request) => {
        const body = new URLSearchParams(await request.text())
        return await oauth.exchangeCode(
          body.get("code") ?? "",
          body.get("code_verifier") ?? ""
        )
      },
    },
    {
      method: "GET",
      route: ROUTES.currentUser,
      answer: (request) => {
        const authorization = request.headers.get("Authorization") ?? ""
        return authorization.startsWith("Bot ")
          ? api.getApplicationUser()
          : oauth.getCurrentUser(authorization.replace(/^Bearer /, ""))
      },
    },
    {
      method: "POST",
      route: ROUTES.currentUserChannels,
      answer: async (request) =>
        await api.createDm(
          (
            await readJson<RESTPostAPICurrentUserCreateDMChannelJSONBody>(
              request
            )
          ).recipient_id
        ),
    },
    {
      method: "POST",
      route: ROUTES.channelMessages,
      answer: async (request, param) =>
        await api.createMessage(
          param("channel.id"),
          await readJson<MessageBody>(request)
        ),
    },
    {
      method: "GET",
      route: ROUTES.user,
      answer: async (_, param) =>
        found(
          ROUTES.user,
          await api.getUser(param("user.id")),
          RESTJSONErrorCodes.UnknownUser,
          "Unknown User"
        ),
    },
  ]

  return async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const path =
      url.origin === DISCORD_ORIGIN
        ? API_PATH.exec(url.pathname)?.[1]
        : undefined
    for (const endpoint of endpoints) {
      const param =
        path === undefined ? undefined : matchRoute(endpoint.route, path)
      if (param !== undefined && request.method === endpoint.method) {
        try {
          return Response.json(await endpoint.answer(request, param))
        } catch (error) {
          return answerFailure(error)
        }
      }
    }
    return Response.json(NOT_FOUND, { status: 404 })
  }
}

function matchRoute(
  route: DiscordRoute,
  path: string
): ParamLookup | undefined {
  const expected = route.split("/")
  const actual = path.split("/")
  if (actual.length !== expected.length) {
    return undefined
  }
  const params = new Map<string, string>()
  for (const [index, segment] of expected.entries()) {
    const value = decodeURIComponent(actual[index] ?? "")
    const name = /^\{(.+)\}$/.exec(segment)?.[1]
    if (name !== undefined) {
      params.set(name, value)
    } else if (value !== segment) {
      return undefined
    }
  }
  return (name) => {
    const value = params.get(name)
    if (value === undefined) {
      throw new Error(`No ${name} in ${route}`)
    }
    return value
  }
}

function found<T>(
  route: DiscordRoute,
  value: T | null,
  code: RESTJSONErrorCodes,
  discordMessage: string
): T {
  if (value === null) {
    throw new DiscordError({
      method: "GET",
      route,
      status: 404,
      code,
      discordMessage,
    })
  }
  return value
}

function reasonOf(request: Request) {
  const reason = request.headers.get("X-Audit-Log-Reason")
  return reason === null ? "" : decodeURIComponent(reason)
}

function auditLogQuery(search: URLSearchParams) {
  const query: RESTGetAPIAuditLogQuery = {}
  const actionType = search.get("action_type")
  const userId = search.get("user_id")
  const before = search.get("before")
  const after = search.get("after")
  const limit = search.get("limit")
  if (actionType !== null) {
    query.action_type = Number(actionType)
  }
  if (userId !== null) {
    query.user_id = userId
  }
  if (before !== null) {
    query.before = before
  }
  if (after !== null) {
    query.after = after
  }
  if (limit !== null) {
    query.limit = Number(limit)
  }
  return query
}

function bansQuery(search: URLSearchParams) {
  const query: BansQuery = {}
  const after = search.get("after")
  const limit = search.get("limit")
  if (after !== null) {
    query.after = after
  }
  if (limit !== null) {
    query.limit = Number(limit)
  }
  return query
}

function answerFailure(error: unknown) {
  if (!(error instanceof DiscordError) || error.status === undefined) {
    throw error
  }
  return Response.json(
    {
      message: error.discordMessage,
      code: error.code,
      retry_after: error.retryAfter,
    },
    { status: error.status }
  )
}
