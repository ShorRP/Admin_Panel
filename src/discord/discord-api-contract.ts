import { setTimeout as sleep } from "node:timers/promises"
import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  ChannelType,
  OverwriteType,
  RESTJSONErrorCodes,
  type APIAuditLogEntry,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type Snowflake,
} from "discord-api-types/v10"
import {
  afterAll,
  beforeAll,
  chai,
  describe,
  expect,
  onTestFinished,
  test,
} from "vitest"

import type { DiscordApi, MessageBody, MessageSearchQuery } from "./discord-api"
import { DiscordError } from "./discord-error"

export const CONTRACT_RULE_PREFIX = "Contract "

const NO_ACCOUNT_ID = "100000000000000000"

const NO_CHANNEL_ID = "100000000000000000"

const BITFIELD = /^\d+$/

export type ContractTarget = {
  discord: DiscordApi
  outsider: Snowflake
  member: Snowflake
  absent: Snowflake
  deleteMessage(channelId: Snowflake, messageId: Snowflake): Promise<void>
  cleanUp(): Promise<void>
}

const REFUSED = {
  status: 400,
  code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
  unavailable: false,
}

function keywordRule(
  keywords: string[]
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: `${CONTRACT_RULE_PREFIX}${crypto.randomUUID().slice(0, 8)}`,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: keywords },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: false,
  }
}

function keywordChanges(keywordFilter: string[]) {
  return { trigger_metadata: { keyword_filter: keywordFilter } }
}

const DAY_S = 86_400

const CLOCK_SKEW_S = 60

function secondsFromNow(seconds: number) {
  return new Date((Math.floor(Date.now() / 1000) + seconds) * 1000)
}

function timeoutUntil(end: Date | null) {
  return { communication_disabled_until: end?.toISOString() ?? null }
}

function timeoutEndOf(value: unknown) {
  return typeof value === "string" ? new Date(value).toISOString() : null
}

async function liftTimeout(discord: DiscordApi, member: Snowflake) {
  await discord.modifyMember(member, timeoutUntil(null), "Contract: clean-up")
}

async function liftBan(discord: DiscordApi, account: Snowflake) {
  if ((await discord.getBan(account)) !== null) {
    await discord.removeBan(account, "Contract: clean-up")
  }
}

async function entryWith(
  discord: DiscordApi,
  actionType: AuditLogEvent,
  reason: string
) {
  const log = await discord.getAuditLog({ action_type: actionType, limit: 100 })
  return {
    entry: log.audit_log_entries.find((entry) => entry.reason === reason),
    userIds: log.users.map(({ id }) => id),
  }
}

function uniqueText(change: string) {
  return `Contract: ${change} ${crypto.randomUUID().slice(0, 8)}`
}

async function memberUpdateWith(discord: DiscordApi, reason: string) {
  return (await entryWith(discord, AuditLogEvent.MemberUpdate, reason)).entry
}

function timeoutChangeOf(entry: APIAuditLogEntry | undefined) {
  const change = entry?.changes?.find(
    ({ key }) => key === "communication_disabled_until"
  )
  return (
    change && {
      old_value: timeoutEndOf(change.old_value),
      new_value: timeoutEndOf(change.new_value),
    }
  )
}

function defined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Expected a value")
  }
  return value
}

const MAX_ATTEMPTS = 3

export async function patiently<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      if (
        !(error instanceof DiscordError) ||
        error.status !== 429 ||
        error.retryAfter === undefined ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error
      }
      await sleep(error.retryAfter * 1000)
    }
  }
}

function patient(discord: DiscordApi): DiscordApi {
  return {
    guildId: discord.guildId,
    getGuild: () => patiently(() => discord.getGuild()),
    getApplicationUser: () => patiently(() => discord.getApplicationUser()),
    getMember: (userId) => patiently(() => discord.getMember(userId)),
    modifyMember: (userId, changes, reason) =>
      patiently(() => discord.modifyMember(userId, changes, reason)),
    removeMember: (userId, reason) =>
      patiently(() => discord.removeMember(userId, reason)),
    createBan: (userId, ban, reason) =>
      patiently(() => discord.createBan(userId, ban, reason)),
    removeBan: (userId, reason) =>
      patiently(() => discord.removeBan(userId, reason)),
    createDm: (recipientId) => patiently(() => discord.createDm(recipientId)),
    createMessage: (channelId, message) =>
      patiently(() => discord.createMessage(channelId, message)),
    listMessages: (channelId, query) =>
      patiently(() => discord.listMessages(channelId, query)),
    listAutoModerationRules: () =>
      patiently(() => discord.listAutoModerationRules()),
    createAutoModerationRule: (rule, reason) =>
      patiently(() => discord.createAutoModerationRule(rule, reason)),
    modifyAutoModerationRule: (ruleId, changes, reason) =>
      patiently(() =>
        discord.modifyAutoModerationRule(ruleId, changes, reason)
      ),
    getAuditLog: (query) => patiently(() => discord.getAuditLog(query)),
    listMembers: (query) => patiently(() => discord.listMembers(query)),
    getUser: (userId) => patiently(() => discord.getUser(userId)),
    getBan: (userId) => patiently(() => discord.getBan(userId)),
    listBans: (query) => patiently(() => discord.listBans(query)),
    listRoles: () => patiently(() => discord.listRoles()),
    listChannels: () => patiently(() => discord.listChannels()),
    searchMessages: (query) => patiently(() => discord.searchMessages(query)),
  }
}

const INDEX_TIMEOUT_MS = 240_000

const INDEX_INTERVAL_MS = 5000

const SEARCH_TEST_TIMEOUT_MS = INDEX_TIMEOUT_MS + 60_000

async function indexed<T>(check: () => Promise<T>) {
  const deadline = Date.now() + INDEX_TIMEOUT_MS
  for (;;) {
    try {
      return await check()
    } catch (error) {
      if (!(error instanceof chai.AssertionError) || Date.now() > deadline) {
        throw error
      }
      await sleep(INDEX_INTERVAL_MS)
    }
  }
}

function uniqueWord() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) =>
    String.fromCharCode(97 + (byte % 26))
  ).join("")
}

async function postInReadableTextChannel(
  discord: DiscordApi,
  message: MessageBody
) {
  for (const { id, type } of await discord.listChannels()) {
    if (type !== ChannelType.GuildText) {
      continue
    }
    try {
      await discord.listMessages(id, { limit: 1 })
    } catch (error) {
      if (error instanceof DiscordError && error.status === 403) {
        continue
      }
      throw error
    }
    return { channelId: id, message: await discord.createMessage(id, message) }
  }
  throw new Error(
    "The Discord server has no text channel that the application reads"
  )
}

async function applicationMember(discord: DiscordApi) {
  return defined(
    await discord.getMember((await discord.getApplicationUser()).id)
  )
}

export function describeDiscordApiContract(
  name: string,
  connect: () => ContractTarget
) {
  function connected() {
    const target = connect()
    onTestFinished(() => target.cleanUp())
    return { ...target, discord: patient(target.discord) }
  }

  describe(`${name}, through DiscordApi`, () => {
    test("a created rule is listed as it was created", async () => {
      const { discord } = connected()
      const rule = keywordRule(["contract"])

      const created = await discord.createAutoModerationRule(
        rule,
        "Contract: rule created"
      )

      const listed = (await discord.listAutoModerationRules()).find(
        ({ id }) => id === created.id
      )
      expect(listed).toMatchObject({
        name: rule.name,
        trigger_type: AutoModerationRuleTriggerType.Keyword,
        trigger_metadata: { keyword_filter: ["contract"] },
        enabled: false,
      })
    })

    test("a modified rule keeps its new keywords", async () => {
      const { discord } = connected()
      const created = await discord.createAutoModerationRule(
        keywordRule(["contract"]),
        "Contract: rule created"
      )

      const modified = await discord.modifyAutoModerationRule(
        created.id,
        keywordChanges(["contract", "modified"]),
        "Contract: rule modified"
      )

      expect(modified.trigger_metadata.keyword_filter).toEqual([
        "contract",
        "modified",
      ])
      const listed = (await discord.listAutoModerationRules()).find(
        ({ id }) => id === created.id
      )
      expect(listed?.trigger_metadata.keyword_filter).toEqual([
        "contract",
        "modified",
      ])
    })

    test("a rule's keywords can all be removed", async () => {
      const { discord } = connected()
      const created = await discord.createAutoModerationRule(
        keywordRule(["contract"]),
        "Contract: rule created"
      )

      await discord.modifyAutoModerationRule(
        created.id,
        keywordChanges([]),
        "Contract: rule emptied"
      )

      const listed = (await discord.listAutoModerationRules()).find(
        ({ id }) => id === created.id
      )
      expect(listed?.trigger_metadata.keyword_filter).toEqual([])
    })

    test("each write adds an audit log entry with its reason, under the application, which is a member", async () => {
      const { discord } = connected()
      const created = await discord.createAutoModerationRule(
        keywordRule(["contract"]),
        "Contract: rule created, « é »"
      )
      await discord.modifyAutoModerationRule(
        created.id,
        keywordChanges(["contract", "modified"]),
        "Contract: rule modified, « é »"
      )

      const creations = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleCreate,
      })
      const creation = creations.audit_log_entries.find(
        ({ target_id }) => target_id === created.id
      )
      const modifications = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
      })
      const modification = modifications.audit_log_entries.find(
        ({ target_id }) => target_id === created.id
      )

      expect(creation?.reason).toBe("Contract: rule created, « é »")
      expect(modification?.reason).toBe("Contract: rule modified, « é »")
      expect(modification?.user_id).toBe(creation?.user_id)
      const author = creations.users.find(({ id }) => id === creation?.user_id)
      expect(author?.bot).toBe(true)
      const member = await discord.getMember(defined(creation?.user_id))
      expect(member?.user.id).toBe(creation?.user_id)
      expect(member?.roles).toBeInstanceOf(Array)
      expect((await discord.getApplicationUser()).id).toBe(creation?.user_id)
    })

    test("the audit log reads newest first, before an entry, or oldest first after one", async () => {
      const { discord } = connected()
      const created = await discord.createAutoModerationRule(
        keywordRule(["a"]),
        "Contract: rule created"
      )
      for (const keyword of ["b", "c", "d"]) {
        await discord.modifyAutoModerationRule(
          created.id,
          keywordChanges(["a", keyword]),
          `Contract: ${keyword} added`
        )
      }

      const newest = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        limit: 3,
      })
      expect(newest.audit_log_entries.map(({ reason }) => reason)).toEqual([
        "Contract: d added",
        "Contract: c added",
        "Contract: b added",
      ])
      const [third, second, first] = newest.audit_log_entries.map(
        ({ id }) => id
      )
      const before = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        before: defined(third),
        limit: 2,
      })
      expect(before.audit_log_entries.map(({ id }) => id)).toEqual([
        second,
        first,
      ])
      const after = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        after: defined(first),
        limit: 2,
      })
      expect(after.audit_log_entries.map(({ id }) => id)).toEqual([
        second,
        third,
      ])
    })

    test("a reason keeps its first 512 characters, accented ones included, and an empty one leaves none", async () => {
      const { discord } = connected()
      const created = await discord.createAutoModerationRule(
        keywordRule(["a"]),
        "é".repeat(512)
      )
      await discord.modifyAutoModerationRule(
        created.id,
        keywordChanges(["b"]),
        `${"é".repeat(512)}z`
      )
      await discord.modifyAutoModerationRule(
        created.id,
        keywordChanges(["c"]),
        ""
      )

      const creations = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleCreate,
      })
      expect(
        creations.audit_log_entries.find(
          ({ target_id }) => target_id === created.id
        )?.reason
      ).toBe("é".repeat(512))
      const modifications = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        limit: 2,
      })
      expect(
        modifications.audit_log_entries
          .filter(({ target_id }) => target_id === created.id)
          .map(({ reason }) => reason)
      ).toEqual([undefined, "é".repeat(512)])
    })

    test("a rule holds up to 1,000 keywords of up to 60 characters, accented ones included", async () => {
      const { discord } = connected()
      const thousand = Array.from(
        { length: 1000 },
        (_, index) => `keyword${index}`
      )

      const created = await discord.createAutoModerationRule(
        keywordRule(thousand),
        "Contract: 1,000 keywords"
      )

      expect(created.trigger_metadata.keyword_filter).toHaveLength(1000)
      await expect(
        discord.modifyAutoModerationRule(
          created.id,
          keywordChanges([...thousand, "keyword1000"]),
          "Contract: 1,001 keywords"
        )
      ).rejects.toMatchObject(REFUSED)
      const modified = await discord.modifyAutoModerationRule(
        created.id,
        keywordChanges(["é".repeat(60)]),
        "Contract: a keyword of 60 characters"
      )
      expect(modified.trigger_metadata.keyword_filter).toEqual(["é".repeat(60)])
      await expect(
        discord.modifyAutoModerationRule(
          created.id,
          keywordChanges(["é".repeat(61)]),
          "Contract: a keyword of 61 characters"
        )
      ).rejects.toMatchObject(REFUSED)
      await expect(
        discord.createAutoModerationRule(
          keywordRule(["é".repeat(61)]),
          "Contract: a keyword of 61 characters"
        )
      ).rejects.toMatchObject(REFUSED)
    })

    test("a keyword's 60 characters count an emoji as one", async () => {
      const { discord } = connected()

      const created = await discord.createAutoModerationRule(
        keywordRule(["😀".repeat(60)]),
        "Contract: a keyword of 60 emoji"
      )

      expect(created.trigger_metadata.keyword_filter).toEqual(["😀".repeat(60)])
      await expect(
        discord.modifyAutoModerationRule(
          created.id,
          keywordChanges(["😀".repeat(61)]),
          "Contract: a keyword of 61 emoji"
        )
      ).rejects.toMatchObject(REFUSED)
    })

    test("a rule that blocks the message with a custom message and times the member out, with an exempt role, is read back as created, and AutoMod refuses a longer timeout, or a custom message of more than 300 characters, which its documentation limits to 150", async () => {
      const { discord } = connected()
      const exemptRole = defined((await applicationMember(discord)).roles[0])
      const blocking = (customMessage: string) => ({
        type: AutoModerationActionType.BlockMessage,
        metadata: { custom_message: customMessage },
      })
      const timingOut = (seconds: number) => ({
        type: AutoModerationActionType.Timeout,
        metadata: { duration_seconds: seconds },
      })
      const longestMessage = "é".repeat(300)

      const created = await discord.createAutoModerationRule(
        {
          ...keywordRule(["contract-timeout-rule"]),
          actions: [blocking(longestMessage), timingOut(2_419_200)],
          exempt_roles: [exemptRole],
        },
        "Contract: a rule that times out"
      )

      const readBack = async () =>
        (await discord.listAutoModerationRules()).find(
          ({ id }) => id === created.id
        )
      const asCreated = {
        actions: [blocking(longestMessage), timingOut(2_419_200)],
        exempt_roles: [exemptRole],
        enabled: false,
      }
      expect(await readBack()).toMatchObject(asCreated)
      await expect(
        discord.modifyAutoModerationRule(
          created.id,
          { actions: [blocking(longestMessage), timingOut(2_419_201)] },
          "Contract: a timeout of 2,419,201 seconds"
        )
      ).rejects.toMatchObject(REFUSED)
      await expect(
        discord.modifyAutoModerationRule(
          created.id,
          { actions: [blocking(`${longestMessage}é`), timingOut(3600)] },
          "Contract: a custom message of 301 characters"
        )
      ).rejects.toMatchObject(REFUSED)
      await expect(
        discord.createAutoModerationRule(
          {
            ...keywordRule(["contract-timeout-rule"]),
            actions: [blocking(`${longestMessage}é`)],
          },
          "Contract: a custom message of 301 characters"
        )
      ).rejects.toMatchObject(REFUSED)
      expect(await readBack()).toMatchObject(asCreated)
    })

    test("a Discord server holds up to 6 keyword rules", async () => {
      const { discord } = connected()
      const rules = await discord.listAutoModerationRules()
      const keywordRules = rules.filter(
        ({ trigger_type }) =>
          trigger_type === AutoModerationRuleTriggerType.Keyword
      ).length

      for (let count = keywordRules; count < 6; count++) {
        await discord.createAutoModerationRule(
          keywordRule(["a"]),
          "Contract: a keyword rule"
        )
      }

      await expect(
        discord.createAutoModerationRule(
          keywordRule(["a"]),
          "Contract: one keyword rule too many"
        )
      ).rejects.toMatchObject(REFUSED)
    })

    test("modifying a rule that does not exist fails with a 404", async () => {
      const { discord } = connected()

      await expect(
        discord.modifyAutoModerationRule(
          "100000000000000000",
          keywordChanges(["a"]),
          "Contract: a missing rule"
        )
      ).rejects.toMatchObject({ status: 404, unavailable: false })
    })

    test("a user who is not on the Discord server is read as null", async () => {
      const { discord, outsider } = connected()

      expect(await discord.getMember(outsider)).toBeNull()
    })

    test("a user is read by ID, on the Discord server or not", async () => {
      const { discord, outsider } = connected()
      const member = await applicationMember(discord)

      expect(await discord.getUser(outsider)).toMatchObject({ id: outsider })
      expect(await discord.getUser(member.user.id)).toMatchObject({
        id: member.user.id,
        username: member.user.username,
      })
    })

    test("an ID that names no account is read as null", async () => {
      const { discord } = connected()

      expect(await discord.getUser(NO_ACCOUNT_ID)).toBeNull()
    })

    test("the members list holds the application, by ascending ID", async () => {
      const { discord } = connected()
      const application = await discord.getApplicationUser()

      const members = await discord.listMembers({ limit: 1000 })

      expect(members.map(({ user }) => user.id)).toContain(application.id)
      const ids = members.map(({ user }) => BigInt(user.id))
      expect(ids).toEqual(
        ids.toSorted((left, right) => (left < right ? -1 : 1))
      )
    })

    test("a page of one member is followed by the page after its ID, which holds a member with a greater ID", async () => {
      const { discord } = connected()

      const [first] = await discord.listMembers({ limit: 1 })
      const [next] = await discord.listMembers({
        after: defined(first).user.id,
        limit: 1,
      })

      expect(BigInt(defined(next).user.id)).toBeGreaterThan(
        BigInt(defined(first).user.id)
      )
    })

    test("a user who is not banned has no ban, and the bans read as a list", async () => {
      const { discord, outsider } = connected()

      expect(await discord.getBan(outsider)).toBeNull()
      expect(await discord.listBans({ limit: 1000 })).toBeInstanceOf(Array)
    })

    test("the Discord server's roles include @everyone, whose ID is the Discord server's", async () => {
      const { discord } = connected()

      const roles = await discord.listRoles()

      expect(roles.find(({ id }) => id === discord.guildId)).toMatchObject({
        name: "@everyone",
      })
    })

    test("every role of the Discord server carries a primary color, a whole number from 0, which is no color, to 0xffffff", async () => {
      const { discord } = connected()

      const roles = await discord.listRoles()

      expect(roles.length).toBeGreaterThan(0)
      for (const { name, colors } of roles) {
        const color = colors.primary_color
        expect(Number.isInteger(color), name).toBe(true)
        expect(color, name).toBeGreaterThanOrEqual(0)
        expect(color, name).toBeLessThanOrEqual(0xffffff)
      }
    })

    test("every role of the Discord server carries its permissions as a bitfield string, @everyone's included, whether listed or read with the Discord server", async () => {
      const { discord } = connected()

      const listed = await discord.listRoles()
      const { roles } = await discord.getGuild()

      for (const role of [...listed, ...roles]) {
        expect(role.permissions, role.name).toMatch(BITFIELD)
      }
      expect(roles.map(({ id }) => id).toSorted()).toEqual(
        listed.map(({ id }) => id).toSorted()
      )
    })

    test("the channels of the Discord server are listed with their type, their name, their parent category and their permission overwrites, whose permissions are bitfield strings", async () => {
      const { discord } = connected()

      const channels = await discord.listChannels()

      expect(channels.length).toBeGreaterThan(0)
      const categoryIds = channels
        .filter(({ type }) => type === ChannelType.GuildCategory)
        .map(({ id }) => id)
      expect(categoryIds.length).toBeGreaterThan(0)
      for (const channel of channels) {
        const { id, name, parent_id, permission_overwrites } = channel
        expect(Number.isInteger(channel.type), id).toBe(true)
        expect(typeof name, id).toBe("string")
        if (parent_id !== null) {
          expect(categoryIds, id).toContain(parent_id)
        }
        for (const overwrite of permission_overwrites) {
          expect([OverwriteType.Role, OverwriteType.Member], id).toContain(
            overwrite.type
          )
          expect(overwrite.allow, id).toMatch(BITFIELD)
          expect(overwrite.deny, id).toMatch(BITFIELD)
        }
      }
    })

    test("the Discord server names its owner, a member, and holds its roles, @everyone included", async () => {
      const { discord } = connected()

      const guild = await discord.getGuild()

      expect(guild.id).toBe(discord.guildId)
      expect(await discord.getMember(guild.owner_id)).not.toBeNull()
      expect(
        guild.roles.find(({ id }) => id === discord.guildId)
      ).toMatchObject({ name: "@everyone" })
    })

    test("the application reads itself as a bot user, which is a member", async () => {
      const { discord } = connected()

      const application = await discord.getApplicationUser()

      expect(application.bot).toBe(true)
      expect(await discord.getMember(application.id)).toMatchObject({
        user: { id: application.id },
      })
    })

    test("a timeout sets its end on the member, a new one replaces it, and lifting it clears it, each in the audit log with its reason, whose users name the member", async () => {
      const { discord, member } = connected()
      onTestFinished(() => liftTimeout(discord, member))
      const first = secondsFromNow(60)
      const second = secondsFromNow(300)
      const timeOut = uniqueText("timed out")
      const replace = uniqueText("timeout replaced")
      const lift = uniqueText("timeout lifted")

      const timedOut = await discord.modifyMember(
        member,
        timeoutUntil(first),
        timeOut
      )
      expect(timeoutEndOf(timedOut.communication_disabled_until)).toBe(
        first.toISOString()
      )
      await discord.modifyMember(member, timeoutUntil(second), replace)
      expect(
        timeoutEndOf(
          (await discord.getMember(member))?.communication_disabled_until
        )
      ).toBe(second.toISOString())
      await discord.modifyMember(member, timeoutUntil(null), lift)

      expect(
        timeoutEndOf(
          (await discord.getMember(member))?.communication_disabled_until
        )
      ).toBeNull()
      const timeOutEntry = await memberUpdateWith(discord, timeOut)
      expect(timeOutEntry).toMatchObject({
        target_id: member,
        user_id: (await discord.getApplicationUser()).id,
      })
      expect(timeoutChangeOf(timeOutEntry)?.new_value).toBe(first.toISOString())
      const updates = await discord.getAuditLog({
        action_type: AuditLogEvent.MemberUpdate,
        limit: 100,
      })
      expect(updates.users.map(({ id }) => id)).toContain(member)
      expect(timeoutChangeOf(await memberUpdateWith(discord, replace))).toEqual(
        { old_value: first.toISOString(), new_value: second.toISOString() }
      )
      expect(timeoutChangeOf(await memberUpdateWith(discord, lift))).toEqual({
        old_value: second.toISOString(),
        new_value: null,
      })
    })

    test("a timeout ends at most 28 days later", async () => {
      const { discord, member } = connected()
      onTestFinished(() => liftTimeout(discord, member))

      await expect(
        discord.modifyMember(
          member,
          timeoutUntil(secondsFromNow(28 * DAY_S + 60)),
          "Contract: a timeout of 28 days and a minute"
        )
      ).rejects.toMatchObject(REFUSED)
      const end = secondsFromNow(28 * DAY_S - CLOCK_SKEW_S)
      const timedOut = await discord.modifyMember(
        member,
        timeoutUntil(end),
        "Contract: a timeout of 28 days less a minute"
      )
      expect(timeoutEndOf(timedOut.communication_disabled_until)).toBe(
        end.toISOString()
      )
    })

    test("the owner of the Discord server cannot be timed out", async () => {
      const { discord } = connected()
      const { owner_id } = await discord.getGuild()

      await expect(
        discord.modifyMember(
          owner_id,
          timeoutUntil(secondsFromNow(60)),
          "Contract: the owner timed out"
        )
      ).rejects.toMatchObject({
        status: 403,
        code: RESTJSONErrorCodes.MissingPermissions,
        unavailable: false,
      })
    })

    test("a user who is not on the Discord server cannot be timed out, as Unknown Member", async () => {
      const { discord, outsider } = connected()

      await expect(
        discord.modifyMember(
          outsider,
          timeoutUntil(secondsFromNow(60)),
          "Contract: an outsider timed out"
        )
      ).rejects.toMatchObject({
        status: 404,
        code: RESTJSONErrorCodes.UnknownMember,
        unavailable: false,
      })
    })

    test("an account absent from the Discord server is banned by its ID, its ban holding the reason, then the ban is lifted, each in the audit log under the application, whose users name the account", async () => {
      const { discord, absent } = connected()
      onTestFinished(() => liftBan(discord, absent))
      const ban = uniqueText("banned, « é »")
      const lift = uniqueText("ban lifted")
      const application = (await discord.getApplicationUser()).id

      await discord.createBan(absent, { delete_message_seconds: 3600 }, ban)

      expect(await discord.getMember(absent)).toBeNull()
      expect(await discord.getBan(absent)).toMatchObject({
        user: { id: absent },
        reason: ban,
      })
      const banAdd = await entryWith(discord, AuditLogEvent.MemberBanAdd, ban)
      expect(banAdd.entry).toMatchObject({
        target_id: absent,
        user_id: application,
      })
      expect(banAdd.userIds).toContain(absent)
      await discord.removeBan(absent, lift)

      expect(await discord.getBan(absent)).toBeNull()
      expect(await discord.getUser(absent)).toMatchObject({ id: absent })
      const banRemove = await entryWith(
        discord,
        AuditLogEvent.MemberBanRemove,
        lift
      )
      expect(banRemove.entry).toMatchObject({
        target_id: absent,
        user_id: application,
      })
      expect(banRemove.userIds).toContain(absent)
    })

    test("a ban deletes at most 7 days of messages", async () => {
      const { discord, absent } = connected()
      onTestFinished(() => liftBan(discord, absent))

      await expect(
        discord.createBan(
          absent,
          { delete_message_seconds: 7 * DAY_S + 1 },
          "Contract: a ban deleting 7 days and a second of messages"
        )
      ).rejects.toMatchObject(REFUSED)
      expect(await discord.getBan(absent)).toBeNull()
    })

    test("lifting the ban of an account that is not banned fails as Unknown Ban", async () => {
      const { discord, outsider } = connected()

      await expect(
        discord.removeBan(outsider, "Contract: an outsider's ban lifted")
      ).rejects.toMatchObject({
        status: 404,
        code: RESTJSONErrorCodes.UnknownBan,
        unavailable: false,
      })
    })

    test("a direct message reaches a member through the channel the application opens with them", async () => {
      const { discord, member, deleteMessage } = connected()
      const content = uniqueText("a direct message, « é »")

      const channel = await discord.createDm(member)
      const message = await discord.createMessage(channel.id, {
        content,
        allowed_mentions: { parse: [] },
      })
      onTestFinished(() => deleteMessage(channel.id, message.id))

      expect(channel.type).toBe(ChannelType.DM)
      expect(message).toMatchObject({ channel_id: channel.id, content })
      expect((await discord.createDm(member)).id).toBe(channel.id)
    })

    test("the messages of a channel are listed newest first with their author and their embed, a page after the other", async () => {
      const { discord, member, deleteMessage } = connected()
      const embed = {
        title: uniqueText("an embed"),
        fields: [{ name: "Champ", value: "valeur, « é »", inline: true }],
      }
      const channel = await discord.createDm(member)
      const older = await discord.createMessage(channel.id, {
        content: uniqueText("an older message"),
        allowed_mentions: { parse: [] },
      })
      onTestFinished(() => deleteMessage(channel.id, older.id))
      const newer = await discord.createMessage(channel.id, {
        embeds: [embed],
        allowed_mentions: { parse: [] },
      })
      onTestFinished(() => deleteMessage(channel.id, newer.id))

      const listed = await discord.listMessages(channel.id, { limit: 2 })
      const beforeNewer = await discord.listMessages(channel.id, {
        before: newer.id,
        limit: 1,
      })

      expect(listed.map(({ id }) => id)).toEqual([newer.id, older.id])
      expect(listed[0]).toMatchObject({
        channel_id: channel.id,
        author: { id: (await discord.getApplicationUser()).id },
        embeds: [embed],
      })
      expect(beforeNewer.map(({ id }) => id)).toEqual([older.id])
    })

    test("the messages of a channel that does not exist fail as Unknown Channel", async () => {
      const { discord } = connected()

      await expect(
        discord.listMessages(NO_CHANNEL_ID, { limit: 1 })
      ).rejects.toMatchObject({
        status: 404,
        code: RESTJSONErrorCodes.UnknownChannel,
        unavailable: false,
      })
    })
    describe("the search of the Discord server's messages", () => {
      const TEXT_PARTS = [
        "title",
        "description",
        "authorName",
        "fieldName",
        "fieldValue",
        "footer",
      ] as const
      type Words = Record<
        | "shared"
        | "content"
        | "accent"
        | "first"
        | "second"
        | "contentOfM3"
        | "embedOfM3"
        | (typeof TEXT_PARTS)[number],
        string
      >
      type Fixture = {
        channelId: Snowflake
        applicationId: Snowflake
        words: Words
        ids: Record<"m1" | "m2" | "m3" | "m4" | "m5" | "m6", Snowflake>
      }
      let connectedTarget: ContractTarget | undefined
      let fixture: Fixture
      const posted: { channelId: Snowflake; id: Snowflake }[] = []

      function target() {
        if (connectedTarget === undefined) {
          throw new Error("The search tests ran before the target connected")
        }
        return connectedTarget
      }

      async function search(query: MessageSearchQuery) {
        return await patient(target().discord).searchMessages({
          channel_id: [fixture.channelId],
          ...query,
        })
      }

      async function foundIds(query: MessageSearchQuery) {
        return (await search(query)).messages.map(({ id }) => id)
      }

      async function finds(query: MessageSearchQuery, expected: Snowflake[]) {
        await indexed(async () => {
          expect(await foundIds(query)).toEqual(expected)
        })
      }

      beforeAll(async () => {
        connectedTarget = connect()
        const discord = patient(connectedTarget.discord)
        const words: Words = {
          shared: uniqueWord(),
          content: uniqueWord(),
          accent: `${uniqueWord()}é${uniqueWord()}`,
          first: uniqueWord(),
          second: uniqueWord(),
          contentOfM3: uniqueWord(),
          embedOfM3: uniqueWord(),
          title: uniqueWord(),
          description: uniqueWord(),
          authorName: uniqueWord(),
          fieldName: uniqueWord(),
          fieldValue: uniqueWord(),
          footer: uniqueWord(),
        }
        const { shared } = words
        const first = await postInReadableTextChannel(discord, {
          content: `Contract: ${shared} ${words.content} ${words.accent} ${words.first} ${words.second}`,
          allowed_mentions: { parse: [] },
        })
        const { channelId } = first
        posted.push({ channelId, id: first.message.id })
        const post = async (message: MessageBody) => {
          const created = await discord.createMessage(channelId, {
            ...message,
            allowed_mentions: { parse: [] },
          })
          posted.push({ channelId, id: created.id })
          return created.id
        }
        const m2 = await post({
          embeds: [
            {
              title: `Contract ${words.title}`,
              description: `${shared} ${words.description}`,
              author: { name: `Contract ${words.authorName}` },
              fields: [
                {
                  name: `Contract ${words.fieldName}`,
                  value: `Contract ${words.fieldValue}`,
                },
              ],
              footer: { text: `Contract ${words.footer}` },
            },
          ],
        })
        const m3 = await post({
          content: `${shared} ${words.contentOfM3}`,
          embeds: [{ description: `${shared} ${words.embedOfM3}` }],
        })
        const m4 = await post({ content: `${shared} four` })
        const m5 = await post({ content: `${shared} five` })
        const m6 = await post({ content: `${shared} six` })
        fixture = {
          channelId,
          applicationId: (await discord.getApplicationUser()).id,
          words,
          ids: { m1: first.message.id, m2, m3, m4, m5, m6 },
        }
      }, SEARCH_TEST_TIMEOUT_MS)

      afterAll(async () => {
        if (connectedTarget === undefined) {
          return
        }
        const failures: unknown[] = []
        for (const { channelId, id } of posted) {
          try {
            await connectedTarget.deleteMessage(channelId, id)
          } catch (error) {
            failures.push(error)
          }
        }
        await connectedTarget.cleanUp()
        if (failures.length > 0) {
          throw new AggregateError(
            failures,
            `${failures.length} of the ${posted.length} messages posted for the search were not deleted`
          )
        }
      }, SEARCH_TEST_TIMEOUT_MS)

      test(
        "a word of a message's content finds that message, with its channel, its author and its content",
        async () => {
          const { shared, content, accent, first, second } = fixture.words

          const found = await indexed(async () => {
            const result = await search({ content })
            expect(result.messages.map(({ id }) => id)).toEqual([
              fixture.ids.m1,
            ])
            return result
          })

          expect(found.total_results).toBe(1)
          expect(found.messages[0]).toMatchObject({
            channel_id: fixture.channelId,
            author: { id: fixture.applicationId },
            content: `Contract: ${shared} ${content} ${accent} ${first} ${second}`,
          })
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "the text of an embed is read: its title, its description, its author's name, its field names and values and its footer find the message that holds them",
        async () => {
          for (const part of TEXT_PARTS) {
            await indexed(async () => {
              expect(
                await foundIds({ content: fixture.words[part] }),
                part
              ).toEqual([fixture.ids.m2])
            })
          }
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "a word is found whole, whatever its case, with the accents it was written with",
        async () => {
          const { content, accent } = fixture.words
          await indexed(async () => {
            expect(await foundIds({ content: content.toUpperCase() })).toEqual([
              fixture.ids.m1,
            ])
            expect(await foundIds({ content: accent })).toEqual([
              fixture.ids.m1,
            ])
          })

          expect(await foundIds({ content: accent.replace("é", "e") })).toEqual(
            []
          )
          expect(await foundIds({ content: content.slice(0, 5) })).toEqual([])
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "several words find a message when they sit close together in one text of it, in any order, and none when they sit in two texts",
        async () => {
          const { first, second, content, description } = fixture.words
          const { contentOfM3, embedOfM3 } = fixture.words
          await indexed(async () => {
            expect(await foundIds({ content: `${second} ${first}` })).toEqual([
              fixture.ids.m1,
            ])
            expect(await foundIds({ content: contentOfM3 })).toEqual([
              fixture.ids.m3,
            ])
            expect(await foundIds({ content: embedOfM3 })).toEqual([
              fixture.ids.m3,
            ])
            expect(await foundIds({ content: description })).toEqual([
              fixture.ids.m2,
            ])
          })

          expect(
            await foundIds({ content: `${content} ${description}` })
          ).toEqual([])
          expect(
            await foundIds({ content: `${contentOfM3} ${embedOfM3}` })
          ).toEqual([])
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "the author filter keeps the messages of the accounts it names and none of another account's",
        async () => {
          const { content } = fixture.words
          await indexed(async () => {
            expect(
              await foundIds({ content, author_id: [fixture.applicationId] })
            ).toEqual([fixture.ids.m1])
          })

          expect(
            await foundIds({ content, author_id: [target().member] })
          ).toEqual([])
          await finds(
            { content, author_id: [target().member, fixture.applicationId] },
            [fixture.ids.m1]
          )
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "min_id and max_id keep the messages strictly after and strictly before a message",
        async () => {
          const { m1, m2, m3, m4, m5, m6 } = fixture.ids
          const { shared } = fixture.words
          await finds({ content: shared }, [m6, m5, m4, m3, m2, m1])
          await finds({ content: shared, min_id: m2 }, [m6, m5, m4, m3])
          await finds({ content: shared, max_id: m5 }, [m4, m3, m2, m1])
          await finds({ content: shared, min_id: m2, max_id: m5 }, [m4, m3])
          expect(
            await foundIds({ content: shared, min_id: m3, max_id: m3 })
          ).toEqual([])
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "limit and offset cut the results into pages, newest first, and sort_order asc reverses them, with the total of all pages",
        async () => {
          const { m1, m2, m3, m4, m5, m6 } = fixture.ids
          const { shared } = fixture.words
          await indexed(async () => {
            const first = await search({ content: shared, limit: 2 })
            expect(first.messages.map(({ id }) => id)).toEqual([m6, m5])
            expect(first.total_results).toBe(6)
          })
          await finds({ content: shared, limit: 2, offset: 2 }, [m4, m3])
          await finds({ content: shared, limit: 2, offset: 4 }, [m2, m1])
          expect(
            await foundIds({ content: shared, limit: 2, offset: 6 })
          ).toEqual([])
          await finds(
            { content: shared, limit: 2, offset: 2, sort_order: "asc" },
            [m3, m4]
          )
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test(
        "a limit over 25, an offset over 9975, a limit or an offset that is not an integer and a text of more than 1024 characters are refused as an invalid form body",
        async () => {
          const discord = patient(target().discord)

          for (const query of [
            { limit: 26 },
            { offset: 9976 },
            { limit: 2.5 },
            { offset: 1.5 },
            { limit: Number.NaN },
            { offset: Number.NaN },
            { content: "a".repeat(1025) },
          ]) {
            await expect(
              discord.searchMessages(query),
              JSON.stringify(query).slice(0, 40)
            ).rejects.toMatchObject(REFUSED)
          }
        },
        SEARCH_TEST_TIMEOUT_MS
      )

      test("a channel that does not exist is refused as Missing Access", async () => {
        await expect(
          patient(target().discord).searchMessages({
            channel_id: [NO_CHANNEL_ID],
          })
        ).rejects.toMatchObject({
          status: 403,
          code: RESTJSONErrorCodes.MissingAccess,
          unavailable: false,
        })
      })
    })
  })
}
