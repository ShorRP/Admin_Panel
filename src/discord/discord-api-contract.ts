import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  RESTJSONErrorCodes,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type Snowflake,
} from "discord-api-types/v10"
import { describe, expect, onTestFinished, test } from "vitest"

import type { DiscordApi } from "./discord-api"

export const CONTRACT_RULE_PREFIX = "Contract "

export type ContractTarget = {
  discord: DiscordApi
  outsider: Snowflake
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

function defined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Expected a value")
  }
  return value
}

export function describeDiscordApiContract(
  name: string,
  connect: () => ContractTarget
) {
  function connected() {
    const target = connect()
    onTestFinished(() => target.cleanUp())
    return target
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

    test("a reason holds 1 to 512 characters, accented ones included", async () => {
      const { discord } = connected()
      const created = await discord.createAutoModerationRule(
        keywordRule(["a"]),
        "é".repeat(512)
      )

      const creations = await discord.getAuditLog({
        action_type: AuditLogEvent.AutoModerationRuleCreate,
      })
      expect(
        creations.audit_log_entries.find(
          ({ target_id }) => target_id === created.id
        )?.reason
      ).toBe("é".repeat(512))
      await expect(
        discord.modifyAutoModerationRule(
          created.id,
          keywordChanges(["b"]),
          "é".repeat(513)
        )
      ).rejects.toMatchObject(REFUSED)
      await expect(
        discord.modifyAutoModerationRule(created.id, keywordChanges(["b"]), "")
      ).rejects.toMatchObject(REFUSED)
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
  })
}
