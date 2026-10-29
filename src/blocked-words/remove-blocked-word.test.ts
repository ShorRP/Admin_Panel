import { AuditLogEvent, AutoModerationActionType } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { addBlockedWord } from "./add-blocked-word"
import { removeBlockedWord } from "./remove-blocked-word"

const STAFF_ROLE_ID = "1300000000000000000"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

function discordWithStaff() {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
}

async function staffMemberOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(
    discord,
    { staffRoleId: STAFF_ROLE_ID, moderationRoleIds: [], banRoleIds: [] },
    ALDIS.id
  )
  if (staffMember === null) {
    throw new Error("Aldis is no staff member")
  }
  return staffMember
}

function form(word: string) {
  const data = new FormData()
  data.set("word", word)
  return data
}

test("a blocked word removed leaves the panel's rule, and the removal is recorded in the audit log", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  await addBlockedWord(discord, staffMember, form("bar"))

  const result = await removeBlockedWord(discord, staffMember, form("foo"))

  expect(result).toEqual({
    ok: true,
    message: "« foo » n’est plus un mot interdit.",
  })
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["bar"] } },
  ])
  const { audit_log_entries } = await discord.getAuditLog({ limit: 1 })
  expect(audit_log_entries).toMatchObject([
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: "aldis (1400000000000000001) : retrait de « foo »",
    },
  ])
})

test("removing a word that is no blocked word succeeds, and writes nothing", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))

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

test("removing a word before the panel's rule exists succeeds, and creates nothing", async () => {
  const discord = discordWithStaff()

  const result = await removeBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo")
  )

  expect(result.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("removing the last blocked word leaves the panel's rule, empty", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))

  await removeBlockedWord(discord, staffMember, form("foo"))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: "Mots interdits du panel",
      trigger_metadata: { keyword_filter: [] },
    },
  ])
})

test("removing a blocked word keeps what was changed by hand in the panel's rule", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
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

test("when Discord does not answer the write, the staff are told to reload and check", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
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
  })
})

test("a blocked word is removed exactly as the list holds it, spaces included", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    trigger_metadata: { keyword_filter: ["foo", " foo "] },
  })

  await removeBlockedWord(discord, staffMember, form(" foo "))

  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo"] } },
  ])
})
