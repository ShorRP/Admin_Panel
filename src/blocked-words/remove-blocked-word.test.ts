import { AuditLogEvent, AutoModerationActionType } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { addBlockedWord } from "./add-blocked-word"
import { removeBlockedWord } from "./remove-blocked-word"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

function discordWithStaff() {
  return new FakeDiscord({
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
    ],
  })
}

async function staffMemberOn(discord: FakeDiscord, user = ALDIS) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF_ROLE_ID,
      moderationRoleIds: [MODERATION_ROLE_ID],
      banRoleIds: [],
    },
    user.id
  )
  if (staffMember === null) {
    throw new Error(`${user.username} is no staff member`)
  }
  return staffMember
}

function moderatorOn(discord: FakeDiscord) {
  return staffMemberOn(discord, BRYN)
}

function form(word: string) {
  const data = new FormData()
  data.set("word", word)
  return data
}

function addition(word: string, action = "block") {
  const data = form(word)
  data.set("action", action)
  return data
}

test("a blocked word removed leaves its rule, and the removal is recorded in the audit log with the action it carried", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))
  await addBlockedWord(discord, staffMember, addition("bar"))

  const result = await removeBlockedWord(discord, staffMember, form("foo"))

  expect(result).toEqual({
    ok: true,
    message:
      "« foo » n’est plus un mot interdit, action « Bloquer seulement ».",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["bar"] } },
  ])
  const { audit_log_entries } = await discord.getAuditLog({ limit: 1 })
  expect(audit_log_entries).toMatchObject([
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason:
        "aldis (1400000000000000001) : retrait de « foo », action « Bloquer seulement »",
    },
  ])
})

test("removing a word that is no blocked word succeeds, and writes nothing", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))

  const result = await removeBlockedWord(discord, staffMember, form("bar"))

  expect(result).toEqual({
    ok: true,
    message: "« bar » n’est plus un mot interdit.",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo"] } },
  ])
  expect((await discord.getAuditLog({})).audit_log_entries).toHaveLength(1)
})

test("removing a word before any panel rule exists succeeds, and creates nothing", async () => {
  const discord = discordWithStaff()

  const result = await removeBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo")
  )

  expect(result.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("removing the last blocked word of a rule leaves the rule, empty", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))

  await removeBlockedWord(discord, staffMember, form("foo"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: "Mots interdits du panel",
      trigger_metadata: { keyword_filter: [] },
    },
  ])
})

test("removing a blocked word keeps what was changed by hand in its rule", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))
  const [rule] = await discord.listAutoModerationRules()
  const alert = {
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: "1500000000000000000" },
  }
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    trigger_metadata: {
      keyword_filter: ["foo", "bar"],
      regex_patterns: ["fo+"],
      allow_list: ["food"],
    },
    actions: [{ type: AutoModerationActionType.BlockMessage }, alert],
  })

  await removeBlockedWord(discord, staffMember, form("foo"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      trigger_metadata: {
        keyword_filter: ["bar"],
        regex_patterns: ["fo+"],
        allow_list: ["food"],
      },
      actions: [{ type: AutoModerationActionType.BlockMessage }, alert],
    },
  ])
})

test("a staff member who does not moderate removes a word that only blocks, and cannot remove one that times out: the write throws, before anything is written", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, moderator, addition("foo"))
  await addBlockedWord(discord, moderator, addition("bar", "timeout-1h"))
  const writes = (await discord.getAuditLog({})).audit_log_entries.length

  await expect(
    removeBlockedWord(discord, staffMember, form("bar"))
  ).rejects.toThrow()
  const removed = await removeBlockedWord(discord, staffMember, form("foo"))

  expect(removed.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: [] } },
    { trigger_metadata: { keyword_filter: ["bar"] } },
  ])
  expect((await discord.getAuditLog({})).audit_log_entries).toHaveLength(
    writes + 1
  )
})

test("a staff member who moderates removes a word that times out, and the removal names its action", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("bar", "timeout-1d"))

  const result = await removeBlockedWord(discord, moderator, form("bar"))

  expect(result).toEqual({
    ok: true,
    message: "« bar » n’est plus un mot interdit, action « Exclusion 1 jour ».",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: [] } },
  ])
  expect(
    (await discord.getAuditLog({ limit: 1 })).audit_log_entries[0]?.reason
  ).toBe(
    "bryn (1400000000000000002) : retrait de « bar », action « Exclusion 1 jour »"
  )
})

async function discordWhereTwoRulesHoldFoo() {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("foo", "timeout-1h"))
  await addBlockedWord(discord, moderator, addition("autre", "block"))
  const [hour, block] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, block?.id ?? "", {
    trigger_metadata: { keyword_filter: ["autre", "foo"] },
  })
  return { discord, moderator, hour, block }
}

test("a word that several rules hold, after a retouch in Discord, is removed from each, one write per rule, each reason naming its own rule's action, and the result names the strongest action", async () => {
  const { discord, moderator } = await discordWhereTwoRulesHoldFoo()
  const before = (await discord.getAuditLog({})).audit_log_entries.length

  const result = await removeBlockedWord(discord, moderator, form("foo"))

  expect(result).toEqual({
    ok: true,
    message:
      "« foo » n’est plus un mot interdit, action « Exclusion 1 heure ».",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: [] } },
    { trigger_metadata: { keyword_filter: ["autre"] } },
  ])
  const { audit_log_entries } = await discord.getAuditLog({})
  expect(audit_log_entries).toHaveLength(before + 2)
  expect(
    audit_log_entries.slice(0, 2).map(({ reason }) => reason?.split(" : ")[1])
  ).toEqual([
    "retrait de « foo », action « Bloquer seulement »",
    "retrait de « foo », action « Exclusion 1 heure »",
  ])
})

test("removing a word that several rules hold takes the right of the strongest action, so a staff member who does not moderate cannot, though one of the rules only blocks", async () => {
  const { discord } = await discordWhereTwoRulesHoldFoo()
  const before = await discord.listAutoModerationRules()

  await expect(
    removeBlockedWord(discord, await staffMemberOn(discord), form("foo"))
  ).rejects.toThrow()

  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("two words that differ by their case are two words: each is removed alone, from the rule that holds it", async () => {
  const discord = discordWithStaff()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, addition("Foo", "timeout-1h"))
  await addBlockedWord(discord, moderator, addition("autre", "block"))
  const [, block] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, block?.id ?? "", {
    trigger_metadata: { keyword_filter: ["autre", "foo"] },
  })

  const staffMember = await staffMemberOn(discord)
  const removed = await removeBlockedWord(discord, staffMember, form("foo"))
  await expect(
    removeBlockedWord(discord, staffMember, form("Foo"))
  ).rejects.toThrow()

  expect(removed.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["Foo"] } },
    { trigger_metadata: { keyword_filter: ["autre"] } },
  ])
})

test("when Discord does not answer the write, the staff are told to reload and check", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 429,
      retryAfter: 2.5,
    })
  )

  const result = await removeBlockedWord(discord, staffMember, form("foo"))

  expect(result).toEqual({
    ok: false,
    message:
      "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie.",
    word: "foo",
    action: "",
  })
})

test("a form without a word as text is refused", async () => {
  const discord = discordWithStaff()

  expect(
    await removeBlockedWord(
      discord,
      await staffMemberOn(discord),
      new FormData()
    )
  ).toEqual({
    ok: false,
    message: "Saisis un mot ou une expression.",
    word: "",
    action: "",
  })
})

test("a blocked word is removed exactly as the list holds it, spaces included", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, addition("foo"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    trigger_metadata: { keyword_filter: ["foo", " foo "] },
  })

  await removeBlockedWord(discord, staffMember, form(" foo "))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo"] } },
  ])
})
