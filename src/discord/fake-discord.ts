import {
  AuditLogEvent,
  AutoModerationRuleTriggerType,
  RESTJSONErrorCodes,
  type APIAuditLog,
  type APIAuditLogEntry,
  type APIAutoModerationRule,
  type APIAutoModerationRuleTriggerMetadata,
  type APIGuildMember,
  type APIUser,
  type RESTGetAPIAuditLogQuery,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type RESTPostOAuth2AccessTokenResult,
  type Snowflake,
} from "discord-api-types/v10"

import type { DiscordApi } from "./discord-api"
import { DiscordError, type HttpMethod } from "./discord-error"
import type { DiscordOAuth } from "./discord-oauth"
import { ROUTES, type DiscordRoute } from "./routes"

export type FakeUser = Pick<APIUser, "id" | "username"> & Partial<APIUser>

export type FakeMember = {
  user: FakeUser
  roles?: Snowflake[]
  nick?: string | null
}

export type FakeDiscordState = {
  members?: FakeMember[]
  autoModerationRules?: APIAutoModerationRule[]
  auditLogEntries?: APIAuditLogEntry[]
}

type FailingMethod = Exclude<
  keyof DiscordApi | keyof DiscordOAuth,
  "authorizationUrl"
>

const MAX_KEYWORD_RULES = 6

const MAX_KEYWORDS = 1000

const MAX_KEYWORD_LENGTH = 60

const MAX_REASON_LENGTH = 512

const DEFAULT_AUDIT_LOG_LIMIT = 50

const DISCORD_EPOCH = BigInt(1420070400000)

const NO_MEMBER_FLAGS: number = 0

function byId(left: { id: Snowflake }, right: { id: Snowflake }) {
  return BigInt(left.id) < BigInt(right.id) ? -1 : 1
}

function lengthOf(text: string) {
  return Array.from(text).length
}

function apiUser(user: FakeUser): APIUser {
  return { discriminator: "0", global_name: null, avatar: null, ...user }
}

function apiMember(member: FakeMember): APIGuildMember {
  return {
    user: apiUser(member.user),
    nick: member.nick ?? null,
    roles: [...(member.roles ?? [])],
    joined_at: "2026-01-01T00:00:00.000000+00:00",
    deaf: false,
    mute: false,
    flags: NO_MEMBER_FLAGS,
  }
}

function refused(method: HttpMethod, route: DiscordRoute) {
  return new DiscordError({
    method,
    route,
    status: 400,
    code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
    discordMessage: "Invalid Form Body",
  })
}

function keptReason(reason: string | undefined) {
  if (reason === undefined || reason === "") {
    return undefined
  }
  return Array.from(reason).slice(0, MAX_REASON_LENGTH).join("")
}

function checkKeywords(
  metadata: APIAutoModerationRuleTriggerMetadata | undefined,
  method: HttpMethod,
  route: DiscordRoute
) {
  const keywords = metadata?.keyword_filter ?? []
  if (
    keywords.length > MAX_KEYWORDS ||
    keywords.some((keyword) => lengthOf(keyword) > MAX_KEYWORD_LENGTH)
  ) {
    throw refused(method, route)
  }
}

export class FakeDiscord implements DiscordApi, DiscordOAuth {
  readonly guildId: Snowflake = "1100000000000000000"
  readonly applicationUser = apiUser({
    id: "1200000000000000000",
    username: "Shor Panel",
    bot: true,
  })
  private increment = 0
  private readonly members = new Map<Snowflake, APIGuildMember>()
  private readonly rules: APIAutoModerationRule[]
  private readonly entries: APIAuditLogEntry[]
  private readonly codes = new Map<string, APIUser>()
  private readonly tokens = new Map<string, APIUser>()
  private readonly failures = new Map<FailingMethod, DiscordError>()

  constructor(state: FakeDiscordState = {}) {
    for (const member of [
      { user: this.applicationUser },
      ...(state.members ?? []),
    ]) {
      this.members.set(member.user.id, apiMember(member))
    }
    this.rules = structuredClone(state.autoModerationRules ?? [])
    this.entries = structuredClone(state.auditLogEntries ?? [])
  }

  failNext(method: FailingMethod, error: DiscordError) {
    this.failures.set(method, error)
  }

  removeMemberRole(userId: Snowflake, roleId: Snowflake) {
    const member = this.memberOf(userId)
    member.roles = member.roles.filter((role) => role !== roleId)
  }

  createAutoModerationRuleAs(
    userId: Snowflake,
    rule: RESTPostAPIAutoModerationRuleJSONBody
  ) {
    return structuredClone(
      this.create(rule, this.memberOf(userId).user.id, undefined)
    )
  }

  modifyAutoModerationRuleAs(
    userId: Snowflake,
    ruleId: Snowflake,
    changes: RESTPatchAPIAutoModerationRuleJSONBody
  ) {
    return structuredClone(
      this.modify(ruleId, changes, this.memberOf(userId).user.id, undefined)
    )
  }

  issueOAuth2Code(user: FakeUser) {
    const code = `code-${this.nextSnowflake()}`
    this.codes.set(code, apiUser(user))
    return code
  }

  getMember(userId: Snowflake) {
    return this.answer("getMember", () => this.members.get(userId) ?? null)
  }

  listAutoModerationRules() {
    return this.answer("listAutoModerationRules", () => this.rules)
  }

  createAutoModerationRule(
    rule: RESTPostAPIAutoModerationRuleJSONBody,
    reason: string
  ) {
    return this.answer("createAutoModerationRule", () =>
      this.create(rule, this.applicationUser.id, reason)
    )
  }

  modifyAutoModerationRule(
    ruleId: Snowflake,
    changes: RESTPatchAPIAutoModerationRuleJSONBody,
    reason: string
  ) {
    return this.answer("modifyAutoModerationRule", () =>
      this.modify(ruleId, changes, this.applicationUser.id, reason)
    )
  }

  getAuditLog(query: RESTGetAPIAuditLogQuery) {
    return this.answer("getAuditLog", (): APIAuditLog => {
      const { action_type, user_id, before, after } = query
      const ascending = this.entries
        .filter(
          (entry) =>
            (action_type === undefined || entry.action_type === action_type) &&
            (user_id === undefined || entry.user_id === user_id) &&
            (before === undefined || BigInt(entry.id) < BigInt(before)) &&
            (after === undefined || BigInt(entry.id) > BigInt(after))
        )
        .toSorted(byId)
      const entries = (
        after === undefined ? ascending.reverse() : ascending
      ).slice(0, query.limit ?? DEFAULT_AUDIT_LOG_LIMIT)
      const userIds = new Set(entries.map((entry) => entry.user_id))
      const targetIds = new Set(entries.map((entry) => entry.target_id))
      return {
        application_commands: [],
        audit_log_entries: entries,
        auto_moderation_rules: this.rules.filter((rule) =>
          targetIds.has(rule.id)
        ),
        guild_scheduled_events: [],
        integrations: [],
        threads: [],
        users: [...this.members.values()]
          .map((member) => member.user)
          .filter((user) => userIds.has(user.id)),
        webhooks: [],
      }
    })
  }

  authorizationUrl(state: string) {
    const url = new URL("https://discord.com/oauth2/authorize")
    url.search = new URLSearchParams({
      client_id: this.applicationUser.id,
      response_type: "code",
      scope: "identify",
      state,
      prompt: "consent",
    }).toString()
    return url.href
  }

  exchangeCode(code: string) {
    return this.answer("exchangeCode", (): RESTPostOAuth2AccessTokenResult => {
      const user = this.codes.get(code)
      if (user === undefined) {
        throw new DiscordError({
          method: "POST",
          route: ROUTES.oauth2Token,
          status: 400,
          discordMessage: "invalid_grant",
        })
      }
      this.codes.delete(code)
      const accessToken = `access-token-${this.nextSnowflake()}`
      this.tokens.set(accessToken, user)
      return {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 604800,
        refresh_token: `refresh-token-${this.nextSnowflake()}`,
        scope: "identify",
      }
    })
  }

  getCurrentUser(accessToken: string) {
    return this.answer("getCurrentUser", () => {
      const user = this.tokens.get(accessToken)
      if (user === undefined) {
        throw new DiscordError({
          method: "GET",
          route: ROUTES.currentUser,
          status: 401,
          code: RESTJSONErrorCodes.GeneralError,
          discordMessage: "401: Unauthorized",
        })
      }
      return user
    })
  }

  private memberOf(userId: Snowflake) {
    const member = this.members.get(userId)
    if (member === undefined) {
      throw new Error(`No member ${userId} on the fake Discord server`)
    }
    return member
  }

  private nextSnowflake(): Snowflake {
    this.increment = (this.increment + 1) % 4096
    return (
      (BigInt(Date.now()) - DISCORD_EPOCH) * BigInt(4194304) +
      BigInt(this.increment)
    ).toString()
  }

  private answer<T>(method: FailingMethod, run: () => T) {
    return new Promise<T>((resolve) => {
      const failure = this.failures.get(method)
      if (failure !== undefined) {
        this.failures.delete(method)
        throw failure
      }
      resolve(structuredClone(run()))
    })
  }

  private create(
    rule: RESTPostAPIAutoModerationRuleJSONBody,
    userId: Snowflake,
    reason: string | undefined
  ) {
    const route = ROUTES.autoModerationRules
    checkKeywords(rule.trigger_metadata, "POST", route)
    if (
      rule.trigger_type === AutoModerationRuleTriggerType.Keyword &&
      this.rules.filter(
        ({ trigger_type }) =>
          trigger_type === AutoModerationRuleTriggerType.Keyword
      ).length >= MAX_KEYWORD_RULES
    ) {
      throw refused("POST", route)
    }
    const created: APIAutoModerationRule = structuredClone({
      id: this.nextSnowflake(),
      guild_id: this.guildId,
      name: rule.name,
      creator_id: userId,
      event_type: rule.event_type,
      trigger_type: rule.trigger_type,
      trigger_metadata: rule.trigger_metadata ?? {},
      actions: rule.actions,
      enabled: rule.enabled ?? false,
      exempt_roles: rule.exempt_roles ?? [],
      exempt_channels: rule.exempt_channels ?? [],
    })
    this.rules.push(created)
    this.log(AuditLogEvent.AutoModerationRuleCreate, created.id, userId, reason)
    return created
  }

  private modify(
    ruleId: Snowflake,
    changes: RESTPatchAPIAutoModerationRuleJSONBody,
    userId: Snowflake,
    reason: string | undefined
  ) {
    const route = ROUTES.autoModerationRule
    const rule = this.rules.find(({ id }) => id === ruleId)
    if (rule === undefined) {
      throw new DiscordError({ method: "PATCH", route, status: 404 })
    }
    checkKeywords(changes.trigger_metadata, "PATCH", route)
    const modified: APIAutoModerationRule = structuredClone({
      ...rule,
      name: changes.name ?? rule.name,
      event_type: changes.event_type ?? rule.event_type,
      trigger_metadata: changes.trigger_metadata ?? rule.trigger_metadata,
      actions: changes.actions ?? rule.actions,
      enabled: changes.enabled ?? rule.enabled,
      exempt_roles: changes.exempt_roles ?? rule.exempt_roles,
      exempt_channels: changes.exempt_channels ?? rule.exempt_channels,
    })
    this.rules.splice(this.rules.indexOf(rule), 1, modified)
    this.log(AuditLogEvent.AutoModerationRuleUpdate, ruleId, userId, reason)
    return modified
  }

  private log(
    actionType: AuditLogEvent,
    targetId: Snowflake,
    userId: Snowflake,
    reason: string | undefined
  ) {
    const kept = keptReason(reason)
    this.entries.push({
      id: this.nextSnowflake(),
      action_type: actionType,
      target_id: targetId,
      user_id: userId,
      ...(kept === undefined ? {} : { reason: kept }),
    })
  }
}
