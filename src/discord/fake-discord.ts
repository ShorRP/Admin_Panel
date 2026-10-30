import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleTriggerType,
  ChannelType,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type APIAuditLog,
  type APIAuditLogChange,
  type APIAuditLogEntry,
  type APIAutoModerationRule,
  type APIAutoModerationRuleTriggerMetadata,
  type APIBan,
  type APIGuildMember,
  type APIRole,
  type APIUser,
  type RESTGetAPIAuditLogQuery,
  type RESTGetAPIGuildMembersSearchQuery,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPatchAPIGuildMemberJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type RESTPostOAuth2AccessTokenResult,
  type Snowflake,
} from "discord-api-types/v10"

import type {
  BanBody,
  BansQuery,
  DiscordApi,
  DmChannel,
  Guild,
  MemberChanges,
  Message,
  MessageBody,
} from "./discord-api"
import { DiscordError, type HttpMethod } from "./discord-error"
import type { DiscordOAuth } from "./discord-oauth"
import { codeChallengeOf } from "./pkce"
import { ROUTES, type DiscordRoute } from "./routes"

export type FakeUser = Pick<APIUser, "id" | "username"> & Partial<APIUser>

export type FakeMember = {
  user: FakeUser
  roles?: Snowflake[]
  nick?: string | null
  avatar?: string | null
  joined_at?: string
  communication_disabled_until?: string | null
  allowsDirectMessages?: boolean
}

export type FakeBan = {
  user: FakeUser
  reason?: string | null
}

export type FakeRole = Pick<APIRole, "id" | "name"> & Partial<APIRole>

export type FakeDiscordState = {
  ownerId?: Snowflake
  applicationRoles?: Snowflake[]
  members?: FakeMember[]
  users?: FakeUser[]
  bans?: FakeBan[]
  roles?: FakeRole[]
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

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000

const MAX_MESSAGE_LENGTH = 2000

const MAX_DELETE_MESSAGE_SECONDS = 7 * 24 * 60 * 60

const DEFAULT_OWNER_ID = "1000000000000000000"

const DEFAULT_AUDIT_LOG_LIMIT = 50

const DEFAULT_SEARCH_LIMIT = 1

const DEFAULT_BANS_LIMIT = 1000

const DISCORD_EPOCH = BigInt(1420070400000)

const NO_MEMBER_FLAGS: number = 0

const NO_ROLE_FLAGS: number = 0

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
    avatar: member.avatar ?? null,
    roles: [...(member.roles ?? [])],
    joined_at: member.joined_at ?? "2026-01-01T00:00:00.000000+00:00",
    communication_disabled_until: member.communication_disabled_until ?? null,
    deaf: false,
    mute: false,
    flags: NO_MEMBER_FLAGS,
  }
}

function apiRole(role: FakeRole): APIRole {
  return {
    color: 0,
    colors: { primary_color: 0, secondary_color: null, tertiary_color: null },
    hoist: false,
    position: 0,
    permissions: "0",
    managed: false,
    mentionable: false,
    flags: NO_ROLE_FLAGS,
    ...role,
  }
}

function startsWithIgnoringCase(text: string | null, start: string) {
  return (
    text !== null &&
    text.toLocaleLowerCase().startsWith(start.toLocaleLowerCase())
  )
}

function refusedGrant(discordMessage: string) {
  return new DiscordError({
    method: "POST",
    route: ROUTES.oauth2Token,
    status: 400,
    discordMessage,
  })
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

function missingPermissions(method: HttpMethod, route: DiscordRoute) {
  return new DiscordError({
    method,
    route,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
}

function notFound(
  method: HttpMethod,
  route: DiscordRoute,
  code: RESTJSONErrorCodes,
  discordMessage: string
) {
  return new DiscordError({ method, route, status: 404, code, discordMessage })
}

function unknownMember(method: HttpMethod) {
  return notFound(
    method,
    ROUTES.guildMember,
    RESTJSONErrorCodes.UnknownMember,
    "Unknown Member"
  )
}

function cannotSendMessages(code: RESTJSONErrorCodes) {
  return new DiscordError({
    method: "POST",
    route: ROUTES.channelMessages,
    status: 403,
    code,
    discordMessage: "Cannot send messages to this user",
  })
}

function changeTimeout(
  member: APIGuildMember,
  end: string | null
): APIAuditLogChange {
  const previous = member.communication_disabled_until ?? null
  member.communication_disabled_until = end
  return {
    key: "communication_disabled_until",
    ...(previous === null ? {} : { old_value: previous }),
    ...(end === null ? {} : { new_value: end }),
  }
}

function changeNick(
  member: APIGuildMember,
  nick: string | null
): APIAuditLogChange {
  const previous = member.nick ?? null
  member.nick = nick
  return {
    key: "nick",
    ...(previous === null ? {} : { old_value: previous }),
    ...(nick === null ? {} : { new_value: nick }),
  }
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
  private readonly ownerId: Snowflake
  private readonly members = new Map<Snowflake, APIGuildMember>()
  private readonly refusingDirectMessages = new Set<Snowflake>()
  private readonly directChannels = new Map<
    Snowflake,
    { recipientId: Snowflake; messages: Message[] }
  >()
  private readonly users = new Map<Snowflake, APIUser>()
  private readonly bans = new Map<Snowflake, APIBan>()
  private readonly deletedMessageSeconds = new Map<Snowflake, number>()
  private readonly roles: APIRole[]
  private readonly rules: APIAutoModerationRule[]
  private readonly entries: APIAuditLogEntry[]
  private readonly codes = new Map<
    string,
    { user: APIUser; codeChallenge: string }
  >()
  private readonly tokens = new Map<string, APIUser>()
  private readonly failures = new Map<FailingMethod, DiscordError>()

  constructor(state: FakeDiscordState = {}) {
    this.ownerId = state.ownerId ?? DEFAULT_OWNER_ID
    for (const member of [
      { user: this.applicationUser, roles: state.applicationRoles ?? [] },
      ...(state.members ?? []),
    ]) {
      this.members.set(member.user.id, apiMember(member))
    }
    for (const member of state.members ?? []) {
      if (member.allowsDirectMessages === false) {
        this.refusingDirectMessages.add(member.user.id)
      }
    }
    for (const user of state.users ?? []) {
      this.users.set(user.id, apiUser(user))
    }
    for (const ban of state.bans ?? []) {
      this.bans.set(ban.user.id, {
        user: apiUser(ban.user),
        reason: ban.reason ?? null,
      })
    }
    this.roles = [
      { id: this.guildId, name: "@everyone" },
      ...(state.roles ?? []),
    ].map(apiRole)
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

  modifyMemberAs(
    userId: Snowflake,
    memberId: Snowflake,
    {
      nick,
      communication_disabled_until: end,
    }: Pick<
      RESTPatchAPIGuildMemberJSONBody,
      "communication_disabled_until" | "nick"
    >,
    reason?: string
  ) {
    const author = this.memberOf(userId)
    const member = this.memberOf(memberId)
    this.log(AuditLogEvent.MemberUpdate, memberId, author.user.id, reason, {
      changes: [
        ...(nick === undefined ? [] : [changeNick(member, nick)]),
        ...(end === undefined ? [] : [changeTimeout(member, end)]),
      ],
    })
    return structuredClone(member)
  }

  removeMemberAs(userId: Snowflake, memberId: Snowflake, reason?: string) {
    this.kick(this.memberOf(memberId), this.memberOf(userId).user.id, reason)
  }

  createBanAs(userId: Snowflake, bannedId: Snowflake, reason?: string) {
    const author = this.memberOf(userId)
    const user = this.knownUser(bannedId)
    if (user === undefined) {
      throw new Error(`No account ${bannedId} on the fake Discord`)
    }
    this.ban(user, 0, author.user.id, reason)
  }

  removeBanAs(userId: Snowflake, bannedId: Snowflake, reason?: string) {
    const author = this.memberOf(userId)
    const ban = this.bans.get(bannedId)
    if (ban === undefined) {
      throw new Error(`No ban of ${bannedId} on the fake Discord server`)
    }
    this.liftBan(ban, author.user.id, reason)
  }

  timeOutByAutoModeration(ruleId: Snowflake, memberId: Snowflake) {
    const rule = this.rules.find(({ id }) => id === ruleId)
    const seconds = rule?.actions.find(
      ({ type }) => type === AutoModerationActionType.Timeout
    )?.metadata?.duration_seconds
    if (rule === undefined || seconds === undefined) {
      throw new Error(`No AutoMod rule ${ruleId} that times out on the fake`)
    }
    const member = this.memberOf(memberId)
    member.communication_disabled_until = new Date(
      Date.now() + seconds * 1000
    ).toISOString()
    this.log(
      AuditLogEvent.AutoModerationUserCommunicationDisabled,
      memberId,
      memberId,
      "Message contained keyword defined in AutoMod rule",
      {
        options: {
          auto_moderation_rule_name: rule.name,
          auto_moderation_rule_trigger_type: `${rule.trigger_type}` as const,
        },
      }
    )
  }

  issueOAuth2Code(user: FakeUser, codeChallenge: string) {
    const code = `code-${this.nextSnowflake()}`
    this.codes.set(code, { user: apiUser(user), codeChallenge })
    return code
  }

  directMessagesTo(userId: Snowflake) {
    return [...this.directChannels.values()]
      .filter(({ recipientId }) => recipientId === userId)
      .flatMap(({ messages }) => messages.map(({ content }) => content))
  }

  deletedMessageSecondsOf(userId: Snowflake) {
    return this.deletedMessageSeconds.get(userId)
  }

  getGuild() {
    return this.answer("getGuild", (): Guild => ({
      id: this.guildId,
      owner_id: this.ownerId,
      roles: this.roles,
    }))
  }

  getApplicationUser() {
    return this.answer("getApplicationUser", () => this.applicationUser)
  }

  getMember(userId: Snowflake) {
    return this.answer("getMember", () => this.members.get(userId) ?? null)
  }

  modifyMember(userId: Snowflake, changes: MemberChanges, reason: string) {
    return this.answer("modifyMember", () => {
      const route = ROUTES.guildMember
      const member = this.members.get(userId)
      if (member === undefined) {
        throw unknownMember("PATCH")
      }
      const end = changes.communication_disabled_until
      if (end === undefined) {
        return member
      }
      if (
        userId === this.ownerId ||
        this.isAdministrator(member) ||
        !this.isBelowApplication(member)
      ) {
        throw missingPermissions("PATCH", route)
      }
      if (end !== null && Date.parse(end) - Date.now() > MAX_TIMEOUT_MS) {
        throw refused("PATCH", route)
      }
      this.log(
        AuditLogEvent.MemberUpdate,
        userId,
        this.applicationUser.id,
        reason,
        { changes: [changeTimeout(member, end)] }
      )
      return member
    })
  }

  removeMember(userId: Snowflake, reason: string) {
    return this.answer("removeMember", () => {
      const member = this.members.get(userId)
      if (member === undefined) {
        throw unknownMember("DELETE")
      }
      if (userId === this.ownerId || !this.isBelowApplication(member)) {
        throw missingPermissions("DELETE", ROUTES.guildMember)
      }
      this.kick(member, this.applicationUser.id, reason)
    })
  }

  createBan(
    userId: Snowflake,
    { delete_message_seconds: seconds = 0 }: BanBody,
    reason: string
  ) {
    return this.answer("createBan", () => {
      const route = ROUTES.guildBan
      if (seconds < 0 || seconds > MAX_DELETE_MESSAGE_SECONDS) {
        throw refused("PUT", route)
      }
      const member = this.members.get(userId)
      if (
        member !== undefined &&
        (userId === this.ownerId || !this.isBelowApplication(member))
      ) {
        throw missingPermissions("PUT", route)
      }
      const user = this.knownUser(userId)
      if (user === undefined) {
        throw notFound(
          "PUT",
          route,
          RESTJSONErrorCodes.UnknownUser,
          "Unknown User"
        )
      }
      this.ban(user, seconds, this.applicationUser.id, reason)
    })
  }

  removeBan(userId: Snowflake, reason: string) {
    return this.answer("removeBan", () => {
      const ban = this.bans.get(userId)
      if (ban === undefined) {
        throw notFound(
          "DELETE",
          ROUTES.guildBan,
          RESTJSONErrorCodes.UnknownBan,
          "Unknown Ban"
        )
      }
      this.liftBan(ban, this.applicationUser.id, reason)
    })
  }

  createDm(recipientId: Snowflake) {
    return this.answer("createDm", (): DmChannel => {
      for (const [id, channel] of this.directChannels) {
        if (channel.recipientId === recipientId) {
          return { id, type: ChannelType.DM }
        }
      }
      if (
        !this.members.has(recipientId) &&
        !this.users.has(recipientId) &&
        !this.bans.has(recipientId)
      ) {
        throw refused("POST", ROUTES.currentUserChannels)
      }
      const id = this.nextSnowflake()
      this.directChannels.set(id, { recipientId, messages: [] })
      return { id, type: ChannelType.DM }
    })
  }

  createMessage(channelId: Snowflake, { content = "" }: MessageBody) {
    return this.answer("createMessage", (): Message => {
      const route = ROUTES.channelMessages
      const channel = this.directChannels.get(channelId)
      if (channel === undefined) {
        throw new DiscordError({
          method: "POST",
          route,
          status: 404,
          code: RESTJSONErrorCodes.UnknownChannel,
          discordMessage: "Unknown Channel",
        })
      }
      if (content === "" || lengthOf(content) > MAX_MESSAGE_LENGTH) {
        throw refused("POST", route)
      }
      if (!this.members.has(channel.recipientId)) {
        throw cannotSendMessages(
          RESTJSONErrorCodes.CannotSendMessagesToThisUserDueToHavingNoMutualGuilds
        )
      }
      if (this.refusingDirectMessages.has(channel.recipientId)) {
        throw cannotSendMessages(
          RESTJSONErrorCodes.CannotSendMessagesToThisUser
        )
      }
      const message = {
        id: this.nextSnowflake(),
        channel_id: channelId,
        content,
      }
      channel.messages.push(message)
      return message
    })
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
      const targetIds = new Set(entries.map((entry) => entry.target_id))
      const userIds = new Set([
        ...entries.map((entry) => entry.user_id),
        ...targetIds,
      ])
      return {
        application_commands: [],
        audit_log_entries: entries,
        auto_moderation_rules: this.rules.filter((rule) =>
          targetIds.has(rule.id)
        ),
        guild_scheduled_events: [],
        integrations: [],
        threads: [],
        users: [...userIds].flatMap((id) => {
          const user = id === null ? undefined : this.knownUser(id)
          return user === undefined ? [] : [user]
        }),
        webhooks: [],
      }
    })
  }

  searchMembers({ query, limit }: RESTGetAPIGuildMembersSearchQuery) {
    return this.answer("searchMembers", () =>
      [...this.members.values()]
        .filter(
          ({ user, nick }) =>
            startsWithIgnoringCase(user.username, query) ||
            startsWithIgnoringCase(nick ?? null, query)
        )
        .slice(0, limit ?? DEFAULT_SEARCH_LIMIT)
    )
  }

  getUser(userId: Snowflake) {
    return this.answer("getUser", () => this.knownUser(userId) ?? null)
  }

  getBan(userId: Snowflake) {
    return this.answer("getBan", () => this.bans.get(userId) ?? null)
  }

  listBans({ after, limit }: BansQuery) {
    return this.answer("listBans", () =>
      [...this.bans.values()]
        .filter(
          ({ user }) => after === undefined || BigInt(user.id) > BigInt(after)
        )
        .toSorted((left, right) => byId(left.user, right.user))
        .slice(0, limit ?? DEFAULT_BANS_LIMIT)
    )
  }

  listRoles() {
    return this.answer("listRoles", () => this.roles)
  }

  authorizationUrl(state: string, codeVerifier: string) {
    const url = new URL("https://discord.com/oauth2/authorize")
    url.search = new URLSearchParams({
      client_id: this.applicationUser.id,
      response_type: "code",
      scope: "identify",
      state,
      prompt: "consent",
      code_challenge: codeChallengeOf(codeVerifier),
      code_challenge_method: "S256",
    }).toString()
    return url.href
  }

  exchangeCode(code: string, codeVerifier: string) {
    return this.answer("exchangeCode", (): RESTPostOAuth2AccessTokenResult => {
      const issued = this.codes.get(code)
      if (issued === undefined) {
        throw refusedGrant("invalid_grant")
      }
      if (codeVerifier === "") {
        throw refusedGrant('invalid_request: Missing "code_verifier"')
      }
      if (codeChallengeOf(codeVerifier) !== issued.codeChallenge) {
        throw refusedGrant("invalid_grant: Code challenge failed.")
      }
      const { user } = issued
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

  private knownUser(userId: Snowflake) {
    return (
      this.members.get(userId)?.user ??
      this.bans.get(userId)?.user ??
      this.users.get(userId)
    )
  }

  private memberOf(userId: Snowflake) {
    const member = this.members.get(userId)
    if (member === undefined) {
      throw new Error(`No member ${userId} on the fake Discord server`)
    }
    return member
  }

  private rolesOf(member: APIGuildMember) {
    return this.roles.filter(
      ({ id }) => id === this.guildId || member.roles.includes(id)
    )
  }

  private highestPosition(member: APIGuildMember) {
    return Math.max(...this.rolesOf(member).map(({ position }) => position))
  }

  private isBelowApplication(member: APIGuildMember) {
    return (
      this.highestPosition(member) <
      this.highestPosition(this.memberOf(this.applicationUser.id))
    )
  }

  private kick(
    member: APIGuildMember,
    userId: Snowflake,
    reason: string | undefined
  ) {
    this.members.delete(member.user.id)
    this.users.set(member.user.id, member.user)
    this.log(AuditLogEvent.MemberKick, member.user.id, userId, reason)
  }

  private ban(
    user: APIUser,
    deletedMessageSeconds: number,
    userId: Snowflake,
    reason: string | undefined
  ) {
    this.members.delete(user.id)
    this.users.delete(user.id)
    this.bans.set(user.id, { user, reason: keptReason(reason) ?? null })
    this.deletedMessageSeconds.set(user.id, deletedMessageSeconds)
    this.log(AuditLogEvent.MemberBanAdd, user.id, userId, reason)
  }

  private liftBan(
    { user }: APIBan,
    userId: Snowflake,
    reason: string | undefined
  ) {
    this.bans.delete(user.id)
    this.users.set(user.id, user)
    this.log(AuditLogEvent.MemberBanRemove, user.id, userId, reason)
  }

  private isAdministrator(member: APIGuildMember) {
    return this.rolesOf(member).some(
      ({ permissions }) =>
        (BigInt(permissions) & PermissionFlagsBits.Administrator) !== BigInt(0)
    )
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
    reason: string | undefined,
    details: Pick<APIAuditLogEntry, "changes" | "options"> = {}
  ) {
    const kept = keptReason(reason)
    this.entries.push({
      id: this.nextSnowflake(),
      action_type: actionType,
      target_id: targetId,
      user_id: userId,
      ...details,
      ...(kept === undefined ? {} : { reason: kept }),
    })
  }
}
