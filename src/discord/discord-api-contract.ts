import { setTimeout as sleep } from "node:timers/promises"
import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  ChannelType,
  RESTJSONErrorCodes,
  type APIAuditLogEntry,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type Snowflake,
} from "discord-api-types/v10"
import { describe, expect, onTestFinished, test } from "vitest"

import type { DiscordApi } from "./discord-api"
import { DiscordError } from "./discord-error"

export const CONTRACT_RULE_PREFIX = "Contract "

const NO_ACCOUNT_ID = "100000000000000000"

export type ContractTarget = {
  discord: DiscordApi
  outsider: Snowflake
  member: Snowflake
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

function uniqueText(change: string) {
  return `Contract: ${change} ${crypto.randomUUID().slice(0, 8)}`
}

async function memberUpdateWith(discord: DiscordApi, reason: string) {
  const updates = await discord.getAuditLog({
    action_type: AuditLogEvent.MemberUpdate,
    limit: 100,
  })
  return updates.audit_log_entries.find((entry) => entry.reason === reason)
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
    createDm: (recipientId) => patiently(() => discord.createDm(recipientId)),
    createMessage: (channelId, message) =>
      patiently(() => discord.createMessage(channelId, message)),
    listAutoModerationRules: () =>
      patiently(() => discord.listAutoModerationRules()),
    createAutoModerationRule: (rule, reason) =>
      patiently(() => discord.createAutoModerationRule(rule, reason)),
    modifyAutoModerationRule: (ruleId, changes, reason) =>
      patiently(() =>
        discord.modifyAutoModerationRule(ruleId, changes, reason)
      ),
    getAuditLog: (query) => patiently(() => discord.getAuditLog(query)),
    searchMembers: (query) => patiently(() => discord.searchMembers(query)),
    getUser: (userId) => patiently(() => discord.getUser(userId)),
    getBan: (userId) => patiently(() => discord.getBan(userId)),
    listBans: (query) => patiently(() => discord.listBans(query)),
    listRoles: () => patiently(() => discord.listRoles()),
  }
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

    test("a search by the start of a member's username finds them, whatever its case", async () => {
      const { discord } = connected()
      const member = await applicationMember(discord)

      const found = await discord.searchMembers({
        query: member.user.username.slice(0, 3).toUpperCase(),
        limit: 1000,
      })

      expect(found.map(({ user }) => user.id)).toContain(member.user.id)
    })

    test("a search that matches no member finds none", async () => {
      const { discord } = connected()

      expect(
        await discord.searchMembers({ query: crypto.randomUUID(), limit: 1000 })
      ).toEqual([])
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

    test("a timeout sets its end on the member, a new one replaces it, and lifting it clears it, each in the audit log with its reason", async () => {
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
      const end = secondsFromNow(28 * DAY_S)
      const timedOut = await discord.modifyMember(
        member,
        timeoutUntil(end),
        "Contract: a timeout of 28 days"
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
  })
}
