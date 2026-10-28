import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { addBlockedWord } from "@/blocked-words/add-blocked-word"
import { removeBlockedWord } from "@/blocked-words/remove-blocked-word"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { readAuditLog } from "./read-audit-log"

const STAFF_ROLE_ID = "1300000000000000000"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

function discordWithStaff() {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
}

async function staffMemberOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)
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

function shown(changes: { memberName: string; description: string }[]) {
  return changes.map(({ memberName, description }) => ({
    memberName,
    description,
  }))
}

test("the blocked words added and removed through the panel show newest first, under the staff member's name", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  await addBlockedWord(discord, staffMember, form("bar"))
  await removeBlockedWord(discord, staffMember, form("foo"))

  const { changes } = await readAuditLog(discord, undefined)

  expect(shown(changes)).toEqual([
    { memberName: "aldis", description: "Retrait de « foo »" },
    { memberName: "aldis", description: "Ajout de « bar »" },
    { memberName: "aldis", description: "Ajout de « foo »" },
  ])
})

const BRYN = {
  id: "1400000000000000002",
  username: "bryn",
  global_name: "Bryn la Rouge",
}

test("a change made in Discord to the panel's rule shows under its author's Discord name, with no detail", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }, { user: BRYN }],
  })
  await addBlockedWord(discord, await staffMemberOn(discord), form("foo"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, rule?.id ?? "", {
    enabled: false,
  })
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    enabled: true,
  })

  const { changes } = await readAuditLog(discord, undefined)

  expect(shown(changes)).toEqual([
    { memberName: "aldis", description: "Règle modifiée dans Discord" },
    {
      memberName: "Bryn la Rouge",
      description: "Règle modifiée dans Discord",
    },
    { memberName: "aldis", description: "Ajout de « foo »" },
  ])
})

const LINKS_RULE = {
  name: "Liens",
  event_type: AutoModerationRuleEventType.MessageSend,
  trigger_type: AutoModerationRuleTriggerType.Keyword,
  trigger_metadata: { keyword_filter: ["http"] },
  actions: [{ type: AutoModerationActionType.BlockMessage }],
}

test("changes to other AutoMod rules never show, however many there are", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  await addBlockedWord(discord, staffMember, form("bar"))
  const links = discord.createAutoModerationRuleAs(ALDIS.id, LINKS_RULE)
  for (let index = 0; index < 120; index++) {
    discord.modifyAutoModerationRuleAs(ALDIS.id, links.id, {
      enabled: index % 2 === 0,
    })
  }

  const { changes } = await readAuditLog(discord, undefined)

  expect(shown(changes)).toEqual([
    { memberName: "aldis", description: "Ajout de « bar »" },
    { memberName: "aldis", description: "Ajout de « foo »" },
  ])
})

test("before the panel's rule exists, the audit log shows no change, even with other AutoMod rules changed", async () => {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(ALDIS.id, LINKS_RULE)

  expect((await readAuditLog(discord, undefined)).changes).toEqual([])
})

test("a page holds the 50 newest changes, and its cursor leads to the older ones", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 51; index++) {
    await addBlockedWord(discord, staffMember, form(`mot${index}`))
  }

  const newest = await readAuditLog(discord, undefined)
  const older = await readAuditLog(discord, newest.older)

  expect(newest.before).toBeNull()
  expect(newest.changes).toHaveLength(50)
  expect(newest.changes[0]?.description).toBe("Ajout de « mot51 »")
  expect(newest.changes.at(-1)?.description).toBe("Ajout de « mot2 »")
  expect(older.before).toBe(newest.older)
  expect(older.older).toBeNull()
  expect(shown(older.changes)).toEqual([
    { memberName: "aldis", description: "Ajout de « mot1 »" },
  ])
})

test("with 50 changes or fewer, there is no older page", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 50; index++) {
    await addBlockedWord(discord, staffMember, form(`mot${index}`))
  }

  const newest = await readAuditLog(discord, undefined)

  expect(newest.changes).toHaveLength(50)
  expect(newest.older).toBeNull()
})

test("an invalid cursor counts as absent, and the newest changes show", async () => {
  const discord = discordWithStaff()
  await addBlockedWord(discord, await staffMemberOn(discord), form("foo"))

  for (const before of [
    "",
    "abc",
    "1234567890123456",
    "-1563530499194880000",
    "18446744073709551616",
    ["1563530499194880000", "1563530499194880001"],
  ]) {
    const page = await readAuditLog(discord, before)
    expect(page.before).toBeNull()
    expect(shown(page.changes)).toEqual([
      { memberName: "aldis", description: "Ajout de « foo »" },
    ])
  }
})

const PANEL_RULE = {
  id: "1500000000000000001",
  guild_id: "1100000000000000000",
  name: "Mots interdits du panel",
  creator_id: "1200000000000000000",
  event_type: AutoModerationRuleEventType.MessageSend,
  trigger_type: AutoModerationRuleTriggerType.Keyword,
  trigger_metadata: { keyword_filter: ["foo"] },
  actions: [{ type: AutoModerationActionType.BlockMessage }],
  enabled: true,
  exempt_roles: [],
  exempt_channels: [],
}

test("each change carries the moment its audit log entry's ID holds", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [
      {
        id: "1563530499194880000",
        action_type: AuditLogEvent.AutoModerationRuleCreate,
        target_id: PANEL_RULE.id,
        user_id: PANEL_RULE.creator_id,
        reason: "aldis (1400000000000000001) : ajout de « foo »",
      },
    ],
  })

  const { changes } = await readAuditLog(discord, undefined)

  expect(changes.map(({ date }) => date)).toEqual([
    new Date("2026-10-24T12:32:00.000Z"),
  ])
})

function panelAddition(id: string, word: string) {
  return {
    id,
    action_type: AuditLogEvent.AutoModerationRuleCreate,
    target_id: PANEL_RULE.id,
    user_id: PANEL_RULE.creator_id,
    reason: `aldis (${ALDIS.id}) : ajout de « ${word} »`,
  }
}

function withAvatars(
  changes: { memberName: string; avatarUrl: string | null }[]
) {
  return changes.map(({ memberName, avatarUrl }) => ({
    memberName,
    avatarUrl,
  }))
}

test("a change made through the panel carries the avatar of the staff member its reason names, under the name the reason gave", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: ALDIS,
        nick: "Aldis le Sage",
        avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
      },
    ],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [panelAddition("1563530499194880000", "foo")],
  })

  const { changes } = await readAuditLog(discord, undefined)

  expect(withAvatars(changes)).toEqual([
    {
      memberName: "aldis",
      avatarUrl:
        "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000001/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64",
    },
  ])
})

test("a change made in Discord carries its author's avatar", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: { ...BRYN, avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9" } },
    ],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [
      {
        id: "1563530499194880000",
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        target_id: PANEL_RULE.id,
        user_id: BRYN.id,
      },
    ],
  })

  const { changes } = await readAuditLog(discord, undefined)

  expect(withAvatars(changes)).toEqual([
    {
      memberName: "Bryn la Rouge",
      avatarUrl:
        "https://cdn.discordapp.com/avatars/1400000000000000002/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
    },
  ])
})

test("a member whose lookup Discord refuses shows no avatar on any of their changes, and the audit log shows all the same", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8" }],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [
      panelAddition("1563530499194880000", "foo"),
      panelAddition("1563530499194880001", "bar"),
    ],
  })
  discord.failNext(
    "getMember",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildMember,
      status: 429,
      retryAfter: 2.5,
    })
  )

  const { changes } = await readAuditLog(discord, undefined)

  expect(withAvatars(changes)).toEqual([
    { memberName: "aldis", avatarUrl: null },
    { memberName: "aldis", avatarUrl: null },
  ])
})

test("a staff member who has left the Discord server shows no avatar, under the name the reason gave", async () => {
  const discord = new FakeDiscord({
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [panelAddition("1563530499194880000", "foo")],
  })

  const { changes } = await readAuditLog(discord, undefined)

  expect(withAvatars(changes)).toEqual([
    { memberName: "aldis", avatarUrl: null },
  ])
})

const BUG = new TypeError("Cannot read properties of undefined")

class FakeDiscordWithBuggyMembers extends FakeDiscord {
  override getMember(): Promise<never> {
    return Promise.reject(BUG)
  }
}

test("a member's lookup that fails with anything but a DiscordError is thrown", async () => {
  const discord = new FakeDiscordWithBuggyMembers({
    members: [{ user: ALDIS }],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [panelAddition("1563530499194880000", "foo")],
  })

  await expect(readAuditLog(discord, undefined)).rejects.toBe(BUG)
})

test("a change made in Discord by an account the audit log does not name shows under « Membre inconnu »", async () => {
  const discord = new FakeDiscord({
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [
      {
        id: "1563530499194880000",
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        target_id: PANEL_RULE.id,
        user_id: "1400000000000000009",
      },
      {
        id: "1563530499194880001",
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        target_id: PANEL_RULE.id,
        user_id: null,
      },
    ],
  })

  const { changes } = await readAuditLog(discord, undefined)

  expect(shown(changes)).toEqual([
    {
      memberName: "Membre inconnu",
      description: "Règle modifiée dans Discord",
    },
    {
      memberName: "Membre inconnu",
      description: "Règle modifiée dans Discord",
    },
  ])
})

test("renamed in Discord, the panel's rule takes its history with it, which starts again with the panel's rule the next blocked word creates", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule?.id ?? "", {
    name: "Anciens mots interdits",
  })

  const renamed = await readAuditLog(discord, undefined)
  await addBlockedWord(discord, staffMember, form("bar"))
  const created = await readAuditLog(discord, undefined)

  expect(renamed.changes).toEqual([])
  expect(shown(created.changes)).toEqual([
    { memberName: "aldis", description: "Ajout de « bar »" },
  ])
})

test("a failed read of the audit log is thrown", async () => {
  const discord = discordWithStaff()
  await addBlockedWord(discord, await staffMemberOn(discord), form("foo"))
  const unavailable = new DiscordError({
    method: "GET",
    route: ROUTES.guildAuditLog,
    status: 503,
  })
  discord.failNext("getAuditLog", unavailable)

  await expect(readAuditLog(discord, undefined)).rejects.toBe(unavailable)
})
