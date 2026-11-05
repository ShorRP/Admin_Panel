import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type RESTGetAPIAuditLogQuery,
} from "discord-api-types/v10"
import { expect, onTestFinished, test, vi } from "vitest"

import { addBlockedWord } from "@/blocked-words/add-blocked-word"
import { removeBlockedWord } from "@/blocked-words/remove-blocked-word"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeDiscordState } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { changeTimeout } from "@/sanctions/change-timeout"
import { findStaffMember, type StaffMember } from "@/staff/staff-member"
import { parisDayOf } from "@/ui/paris-day"
import { auditLogReason } from "./audit-log-reason"
import {
  readAuditLog,
  type AuditLogChange,
  type AuditLogPage,
} from "./read-audit-log"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

function discordWithStaff() {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
}

async function staffMemberOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF_ROLE_ID,
      moderationRoleIds: [MODERATION_ROLE_ID],
      banRoleIds: [],
    },
    ALDIS.id
  )
  if (staffMember === null) {
    throw new Error("Aldis is no staff member")
  }
  return staffMember
}

function form(word: string, action = "block") {
  const data = new FormData()
  data.set("word", word)
  data.set("action", action)
  return data
}

function changesOf({ days }: AuditLogPage) {
  return days.flatMap(({ changes }) => changes)
}

function shown(changes: AuditLogChange[]) {
  return changes.map((change) => ({
    memberName: change.memberName,
    description: change.kind === "rule" ? change.description : null,
  }))
}

const NOW = new Date("2026-10-28T14:00:00.000Z")

function freezeTime() {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

const PANEL_ROLE = {
  id: "1300000000000000021",
  name: "Shor Panel",
  position: 3,
}

const GUARD_ROLE = { id: "1300000000000000010", name: "Garde", position: 1 }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra",
  global_name: "Lyra",
}

function discordWithModerator() {
  return new FakeDiscord(moderatorState())
}

function moderatorState(): FakeDiscordState {
  return {
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 6 },
      { id: MODERATION_ROLE_ID, name: "Modération", position: 5 },
      PANEL_ROLE,
      GUARD_ROLE,
    ],
    applicationRoles: [PANEL_ROLE.id],
    members: [
      {
        user: ALDIS,
        avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
        roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID],
      },
      { user: BRYN, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: LYRA, roles: [GUARD_ROLE.id] },
    ],
  }
}

function sanctionChanges(changes: AuditLogChange[]) {
  return changes.flatMap((change) =>
    change.kind === "sanction-change"
      ? [
          {
            memberName: change.memberName,
            sanctionChange: change.sanctionChange,
            account: change.account,
            reason: change.reason,
          },
        ]
      : []
  )
}

function timeOutForm(reason: string) {
  const data = new FormData()
  data.set("change", "time-out")
  data.set("userId", LYRA.id)
  data.set("duration", "3600")
  data.set("reason", reason)
  return data
}

test("a timeout given through the panel shows among the changes to the blocked words, under its staff member's name and avatar, with its end, its account and its reason", async () => {
  freezeTime()
  const discord = discordWithModerator()
  const moderator = await staffMemberOn(discord)
  await addBlockedWord(discord, moderator, form("foo"))
  await changeTimeout(discord, moderator, timeOutForm("Insultes répétées"))
  await addBlockedWord(discord, moderator, form("bar"))

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(changes).toEqual([
    expect.objectContaining({
      kind: "rule",
      description: "Ajout de « bar », action « Bloquer seulement »",
    }),
    {
      kind: "sanction-change",
      id: expect.any(String),
      date: NOW,
      memberName: "aldis",
      memberId: ALDIS.id,
      avatarUrl:
        "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000001/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64",
      sanctionChange: {
        kind: "timeout",
        end: new Date("2026-10-28T15:00:00.000Z"),
      },
      account: { id: LYRA.id, name: "Lyra" },
      reason: "Insultes répétées",
    },
    expect.objectContaining({
      kind: "rule",
      description: "Ajout de « foo », action « Bloquer seulement »",
    }),
  ])
})

test("timeouts, kicks and bans made in Discord, and their lifting, show under their author's Discord name, with the reason typed there, if any, before the panel's rule exists", async () => {
  const discord = discordWithModerator()
  discord.modifyMemberAs(
    BRYN.id,
    LYRA.id,
    { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
    "Spam"
  )
  discord.modifyMemberAs(BRYN.id, LYRA.id, {
    communication_disabled_until: null,
  })
  discord.removeMemberAs(BRYN.id, LYRA.id, "Provocations")
  discord.createBanAs(BRYN.id, LYRA.id, "Retour sous un autre nom")
  discord.removeBanAs(BRYN.id, LYRA.id)

  const changes = changesOf(await readAuditLog(discord, {}))

  const byBryn = {
    memberName: "Bryn la Rouge",
    account: { id: LYRA.id, name: "Lyra" },
  }
  expect(sanctionChanges(changes)).toEqual([
    { ...byBryn, sanctionChange: { kind: "ban-lift" }, reason: null },
    {
      ...byBryn,
      sanctionChange: { kind: "ban" },
      reason: "Retour sous un autre nom",
    },
    { ...byBryn, sanctionChange: { kind: "kick" }, reason: "Provocations" },
    { ...byBryn, sanctionChange: { kind: "timeout-lift" }, reason: null },
    {
      ...byBryn,
      sanctionChange: {
        kind: "timeout",
        end: new Date("2026-10-29T14:00:00.000Z"),
      },
      reason: "Spam",
    },
  ])
})

const INSULTS_RULE = {
  name: "Insultes",
  event_type: AutoModerationRuleEventType.MessageSend,
  trigger_type: AutoModerationRuleTriggerType.Keyword,
  trigger_metadata: { keyword_filter: ["crétin"] },
  actions: [
    {
      type: AutoModerationActionType.Timeout,
      metadata: { duration_seconds: 600 },
    },
  ],
}

function discordWhereLyraHasAnAvatar() {
  const { members = [], ...state } = moderatorState()
  return new FakeDiscord({
    ...state,
    members: members.map((member) =>
      member.user.id === LYRA.id
        ? { ...member, avatar: "a1b2c3d4e5f60718293a4b5c6d7e8f90" }
        : member
    ),
  })
}

function automaticTimeouts(changes: AuditLogChange[]) {
  return changes.flatMap((change) =>
    change.kind === "automatic-timeout"
      ? [
          {
            memberName: change.memberName,
            memberId: change.memberId,
            avatarUrl: change.avatarUrl,
            account: change.account,
            ruleName: change.ruleName,
          },
        ]
      : []
  )
}

const AUTOMOD_TIMES_OUT_LYRA = {
  memberName: "AutoMod",
  memberId: null,
  avatarUrl: null,
  account: { id: LYRA.id, name: "Lyra" },
  ruleName: "Insultes",
}

test("AutoMod's timeout shows under « Tout » and « Exclusions » alone, under « AutoMod » with no ID and no avatar, with its account and its rule's name, and a change to a member but their timeout never shows", async () => {
  const discord = discordWhereLyraHasAnAvatar()
  const insults = discord.createAutoModerationRuleAs(BRYN.id, INSULTS_RULE)
  discord.timeOutByAutoModeration(insults.id, LYRA.id)
  discord.modifyMemberAs(BRYN.id, LYRA.id, { nick: "Lyra des Brumes" })

  for (const type of [undefined, "timeouts"]) {
    const changes = changesOf(await readAuditLog(discord, { type }))
    expect(changes).toHaveLength(1)
    expect(automaticTimeouts(changes)).toEqual([AUTOMOD_TIMES_OUT_LYRA])
  }
  for (const type of ["blocked-words", "kicks", "bans"]) {
    expect(changesOf(await readAuditLog(discord, { type }))).toEqual([])
  }
})

test("a sanction against an account the audit log does not name shows it as « Compte inconnu »", async () => {
  const discord = new FakeDiscord({
    members: [{ user: BRYN }],
    auditLogEntries: [
      {
        id: "1563530499194880000",
        action_type: AuditLogEvent.MemberKick,
        target_id: "1400000000000000099",
        user_id: BRYN.id,
      },
    ],
  })

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(sanctionChanges(changes)).toEqual([
    {
      memberName: "Bryn la Rouge",
      sanctionChange: { kind: "kick" },
      account: { id: "1400000000000000099", name: "Compte inconnu" },
      reason: null,
    },
  ])
})

test("a page holds the 50 newest changes, to the blocked words and to sanctions together, and its cursor leads to the older ones", async () => {
  const discord = discordWithModerator()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 30; index++) {
    await addBlockedWord(discord, staffMember, form(`mot${index}`))
    discord.modifyMemberAs(
      BRYN.id,
      LYRA.id,
      { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
      `Motif ${index}`
    )
  }

  const newest = await readAuditLog(discord, {})
  const older = await readAuditLog(discord, { before: newest.older })

  expect(changesOf(newest)).toHaveLength(50)
  expect(sanctionChanges(changesOf(newest))[0]?.reason).toBe("Motif 30")
  expect(shown(changesOf(newest)).at(-1)?.description).toBe(
    "Ajout de « mot6 », action « Bloquer seulement »"
  )
  expect(older.older).toBeNull()
  expect(changesOf(older)).toHaveLength(10)
  expect(sanctionChanges(changesOf(older))[0]?.reason).toBe("Motif 5")
  expect(shown(changesOf(older)).at(-1)?.description).toBe(
    "Ajout de « mot1 », action « Bloquer seulement »"
  )
})

test("the blocked words added to each of the panel's rules, and removed from them, show under « Tout » and « Mots interdits », with their action, and the changes to a hand-made rule do not", async () => {
  const discord = discordWithModerator()
  const moderator = await staffMemberOn(discord)
  discord.createAutoModerationRuleAs(BRYN.id, {
    name: "Liens",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["http"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })
  await addBlockedWord(discord, moderator, form("foo"))
  await addBlockedWord(discord, moderator, form("bar", "timeout-1h"))
  await addBlockedWord(discord, moderator, form("baz", "timeout-1d"))
  await removeBlockedWord(discord, moderator, form("bar"))

  const expected = [
    {
      memberName: "aldis",
      description: "Retrait de « bar », action « Exclusion 1 heure »",
    },
    {
      memberName: "aldis",
      description: "Ajout de « baz », action « Exclusion 1 jour »",
    },
    {
      memberName: "aldis",
      description: "Ajout de « bar », action « Exclusion 1 heure »",
    },
    {
      memberName: "aldis",
      description: "Ajout de « foo », action « Bloquer seulement »",
    },
  ]
  expect(shown(changesOf(await readAuditLog(discord, {})))).toEqual(expected)
  expect(
    shown(changesOf(await readAuditLog(discord, { type: "blocked-words" })))
  ).toEqual(expected)
})

test("the blocked words added and removed through the panel show newest first, under the staff member's name", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWord(discord, staffMember, form("foo"))
  await addBlockedWord(discord, staffMember, form("bar"))
  await removeBlockedWord(discord, staffMember, form("foo"))

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(shown(changes)).toEqual([
    {
      memberName: "aldis",
      description: "Retrait de « foo », action « Bloquer seulement »",
    },
    {
      memberName: "aldis",
      description: "Ajout de « bar », action « Bloquer seulement »",
    },
    {
      memberName: "aldis",
      description: "Ajout de « foo », action « Bloquer seulement »",
    },
  ])
})

const BRYN = {
  id: "1400000000000000002",
  username: "bryn",
  global_name: "Bryn la Rouge",
}

test("a change made in Discord to the panel's rule shows under its author's Discord name, with no detail, marked as made in Discord, where a blocked word added through the panel is not", async () => {
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

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(shown(changes)).toEqual([
    { memberName: "aldis", description: "Règle modifiée dans Discord" },
    {
      memberName: "Bryn la Rouge",
      description: "Règle modifiée dans Discord",
    },
    {
      memberName: "aldis",
      description: "Ajout de « foo », action « Bloquer seulement »",
    },
  ])
  expect(
    changes.map((change) => change.kind === "rule" && change.madeInDiscord)
  ).toEqual([true, true, false])
})

test("a timeout, a kick and a ban typed by hand in Discord with a reason in the panel's format show under their author's Discord name, with the whole reason", async () => {
  const discord = discordWithModerator()
  const forgedReason = auditLogReason(
    await staffMemberOn(discord),
    "Insultes répétées"
  )
  discord.modifyMemberAs(
    BRYN.id,
    LYRA.id,
    { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
    forgedReason
  )
  discord.removeMemberAs(BRYN.id, LYRA.id, forgedReason)
  discord.createBanAs(BRYN.id, LYRA.id, forgedReason)

  const changes = changesOf(await readAuditLog(discord, {}))

  const byBryn = {
    memberName: "Bryn la Rouge",
    account: { id: LYRA.id, name: "Lyra" },
    reason: forgedReason,
  }
  expect(sanctionChanges(changes)).toEqual([
    { ...byBryn, sanctionChange: { kind: "ban" } },
    { ...byBryn, sanctionChange: { kind: "kick" } },
    {
      ...byBryn,
      sanctionChange: {
        kind: "timeout",
        end: new Date("2026-10-29T14:00:00.000Z"),
      },
    },
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

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(shown(changes)).toEqual([
    {
      memberName: "aldis",
      description: "Ajout de « bar », action « Bloquer seulement »",
    },
    {
      memberName: "aldis",
      description: "Ajout de « foo », action « Bloquer seulement »",
    },
  ])
})

test("before the panel's rule exists, no change to an AutoMod rule shows", async () => {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(ALDIS.id, LINKS_RULE)

  expect(changesOf(await readAuditLog(discord, {}))).toEqual([])
})

test("a page holds the 50 newest changes, and its cursor leads to the older ones", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 51; index++) {
    await addBlockedWord(discord, staffMember, form(`mot${index}`))
  }

  const newest = await readAuditLog(discord, {})
  const older = await readAuditLog(discord, { before: newest.older })

  expect(newest.before).toBeNull()
  expect(changesOf(newest)).toHaveLength(50)
  expect(shown(changesOf(newest))[0]?.description).toBe(
    "Ajout de « mot51 », action « Bloquer seulement »"
  )
  expect(shown(changesOf(newest)).at(-1)?.description).toBe(
    "Ajout de « mot2 », action « Bloquer seulement »"
  )
  expect(older.before).toBe(newest.older)
  expect(older.older).toBeNull()
  expect(shown(changesOf(older))).toEqual([
    {
      memberName: "aldis",
      description: "Ajout de « mot1 », action « Bloquer seulement »",
    },
  ])
})

test("with 50 changes or fewer, there is no older page", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 50; index++) {
    await addBlockedWord(discord, staffMember, form(`mot${index}`))
  }

  const newest = await readAuditLog(discord, {})

  expect(changesOf(newest)).toHaveLength(50)
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
    const page = await readAuditLog(discord, { before })
    expect(page.before).toBeNull()
    expect(shown(changesOf(page))).toEqual([
      {
        memberName: "aldis",
        description: "Ajout de « foo », action « Bloquer seulement »",
      },
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

  const changes = changesOf(await readAuditLog(discord, {}))

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

  const changes = changesOf(await readAuditLog(discord, {}))

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

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(withAvatars(changes)).toEqual([
    {
      memberName: "Bryn la Rouge",
      avatarUrl:
        "https://cdn.discordapp.com/avatars/1400000000000000002/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
    },
  ])
})

test("a change to the panel's rule written by a member with a reason in the panel's format shows as made in Discord, under that member's name and avatar, not the staff member's the reason names", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: ALDIS, avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8" },
      { user: { ...BRYN, avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9" } },
    ],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [
      {
        ...panelAddition("1563530499194880000", "foo"),
        user_id: BRYN.id,
      },
    ],
  })

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(
    changes.map((change) => ({
      memberName: change.memberName,
      avatarUrl: change.avatarUrl,
      description: change.kind === "rule" ? change.description : null,
      madeInDiscord: change.kind === "rule" && change.madeInDiscord,
    }))
  ).toEqual([
    {
      memberName: "Bryn la Rouge",
      avatarUrl:
        "https://cdn.discordapp.com/avatars/1400000000000000002/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
      description: "Règle modifiée dans Discord",
      madeInDiscord: true,
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

  const changes = changesOf(await readAuditLog(discord, {}))

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

  const changes = changesOf(await readAuditLog(discord, {}))

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

  await expect(readAuditLog(discord, {})).rejects.toBe(BUG)
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

  const changes = changesOf(await readAuditLog(discord, {}))

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

test("each change carries the ID of its author: the staff member its reason names for a change made through the panel, the member of its entry for one made in Discord, and none for an entry that has no member", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS }, { user: BRYN }, { user: LYRA }],
    autoModerationRules: [PANEL_RULE],
    auditLogEntries: [
      panelAddition("1563530499194880000", "foo"),
      {
        id: "1563530499194880001",
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        target_id: PANEL_RULE.id,
        user_id: BRYN.id,
      },
      {
        id: "1563530499194880002",
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        target_id: PANEL_RULE.id,
        user_id: "1400000000000000009",
      },
      {
        id: "1563530499194880003",
        action_type: AuditLogEvent.AutoModerationRuleUpdate,
        target_id: PANEL_RULE.id,
        user_id: null,
      },
    ],
  })
  discord.modifyMemberAs(
    BRYN.id,
    LYRA.id,
    { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
    "Insultes"
  )

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(
    changes.map(({ memberName, memberId }) => ({ memberName, memberId }))
  ).toEqual([
    { memberName: "Bryn la Rouge", memberId: BRYN.id },
    { memberName: "Membre inconnu", memberId: null },
    { memberName: "Membre inconnu", memberId: "1400000000000000009" },
    { memberName: "Bryn la Rouge", memberId: BRYN.id },
    { memberName: "aldis", memberId: ALDIS.id },
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

  const renamed = await readAuditLog(discord, {})
  await addBlockedWord(discord, staffMember, form("bar"))
  const created = await readAuditLog(discord, {})

  expect(changesOf(renamed)).toEqual([])
  expect(shown(changesOf(created))).toEqual([
    {
      memberName: "aldis",
      description: "Ajout de « bar », action « Bloquer seulement »",
    },
  ])
})

function onParisDays(page: AuditLogPage) {
  return page.days.map(({ date, changes }) => ({
    date: parisDayOf(date),
    descriptions: shown(changes).map(({ description }) => description),
  }))
}

async function addBlockedWordAt(
  discord: FakeDiscord,
  staffMember: StaffMember,
  word: string,
  moment: string
) {
  vi.setSystemTime(new Date(moment))
  await addBlockedWord(discord, staffMember, form(word))
}

test("a page's changes sit under the day of Paris they were made on, newest day first", async () => {
  freezeTime()
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWordAt(discord, staffMember, "foo", "2026-10-27T22:59:00Z")
  await addBlockedWordAt(discord, staffMember, "bar", "2026-10-27T23:01:00Z")
  await addBlockedWordAt(discord, staffMember, "baz", "2026-10-28T09:00:00Z")

  expect(onParisDays(await readAuditLog(discord, {}))).toEqual([
    {
      date: "2026-10-28",
      descriptions: [
        "Ajout de « baz », action « Bloquer seulement »",
        "Ajout de « bar », action « Bloquer seulement »",
      ],
    },
    {
      date: "2026-10-27",
      descriptions: ["Ajout de « foo », action « Bloquer seulement »"],
    },
  ])
})

test("a day cut between two pages heads both: the newest page ends on it, and the older one starts on it again", async () => {
  freezeTime()
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  await addBlockedWordAt(discord, staffMember, "mot1", "2026-10-26T10:00:00Z")
  await addBlockedWordAt(discord, staffMember, "mot2", "2026-10-27T10:00:00Z")
  await addBlockedWordAt(discord, staffMember, "mot3", "2026-10-27T11:00:00Z")
  for (let index = 4; index <= 52; index++) {
    await addBlockedWordAt(
      discord,
      staffMember,
      `mot${index}`,
      "2026-10-28T10:00:00Z"
    )
  }

  const newest = await readAuditLog(discord, {})
  const older = await readAuditLog(discord, { before: newest.older })

  expect(
    onParisDays(newest).map(({ date, descriptions }) => [
      date,
      descriptions.length,
    ])
  ).toEqual([
    ["2026-10-28", 49],
    ["2026-10-27", 1],
  ])
  expect(onParisDays(older)).toEqual([
    {
      date: "2026-10-27",
      descriptions: ["Ajout de « mot2 », action « Bloquer seulement »"],
    },
    {
      date: "2026-10-26",
      descriptions: ["Ajout de « mot1 », action « Bloquer seulement »"],
    },
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

  await expect(readAuditLog(discord, {})).rejects.toBe(unavailable)
})

test("a failed read of the panel's application is thrown, rather than leaving every change read as made in Discord", async () => {
  const discord = discordWithStaff()
  await addBlockedWord(discord, await staffMemberOn(discord), form("foo"))
  const unavailable = new DiscordError({
    method: "GET",
    route: ROUTES.currentUser,
    status: 503,
  })
  discord.failNext("getApplicationUser", unavailable)

  await expect(readAuditLog(discord, {})).rejects.toBe(unavailable)
})

async function discordWithEveryKindOfChange() {
  const discord = discordWithModerator()
  await addEveryKindOfChange(discord)
  return discord
}

async function addEveryKindOfChange(discord: FakeDiscord) {
  await addBlockedWord(discord, await staffMemberOn(discord), form("foo"))
  const [rule] = await discord.listAutoModerationRules()
  if (rule === undefined) {
    throw new Error("Adding a blocked word created no panel rule")
  }
  discord.modifyAutoModerationRuleAs(BRYN.id, rule.id, { enabled: false })
  discord.modifyMemberAs(
    BRYN.id,
    LYRA.id,
    { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
    "Spam"
  )
  discord.modifyMemberAs(BRYN.id, LYRA.id, {
    communication_disabled_until: null,
  })
  discord.removeMemberAs(BRYN.id, LYRA.id, "Provocations")
  discord.createBanAs(BRYN.id, LYRA.id, "Retour sous un autre nom")
  discord.removeBanAs(BRYN.id, LYRA.id)
}

function kindsOf(page: AuditLogPage) {
  return changesOf(page).map((change) => {
    if (change.kind === "rule") {
      return change.madeInDiscord ? "rule changed in Discord" : "blocked word"
    }
    return change.kind === "automatic-timeout"
      ? change.kind
      : change.sanctionChange.kind
  })
}

test.each([
  ["blocked-words", ["rule changed in Discord", "blocked word"]],
  ["timeouts", ["timeout-lift", "timeout"]],
  ["kicks", ["kick"]],
  ["bans", ["ban-lift", "ban"]],
])(
  "a page of the type %s holds only its changes, and says its type",
  async (type, kinds) => {
    const discord = await discordWithEveryKindOfChange()

    const page = await readAuditLog(discord, { type })

    expect(page.type).toBe(type)
    expect(kindsOf(page)).toEqual(kinds)
  }
)

const EVERY_KIND = [
  "ban-lift",
  "ban",
  "kick",
  "timeout-lift",
  "timeout",
  "rule changed in Discord",
  "blocked word",
]

test("with no type, a page holds every kind of change, and says it has no type", async () => {
  const discord = await discordWithEveryKindOfChange()

  const page = await readAuditLog(discord, {})

  expect(page.type).toBeNull()
  expect(kindsOf(page)).toEqual(EVERY_KIND)
})

test("an invalid type counts as absent, and every kind of change shows", async () => {
  const discord = await discordWithEveryKindOfChange()

  for (const type of ["", "all", "Timeouts", "timeout", ["timeouts", "bans"]]) {
    const page = await readAuditLog(discord, { type })
    expect(page.type).toBeNull()
    expect(kindsOf(page)).toEqual(EVERY_KIND)
  }
})

test("a type's page holds its 50 newest changes, and its cursor leads to that type's older ones", async () => {
  const discord = discordWithModerator()
  const staffMember = await staffMemberOn(discord)
  for (let index = 1; index <= 30; index++) {
    await addBlockedWord(discord, staffMember, form(`mot${index}`))
    discord.modifyMemberAs(
      BRYN.id,
      LYRA.id,
      { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
      `Motif ${index}`
    )
    discord.modifyMemberAs(BRYN.id, LYRA.id, {
      communication_disabled_until: null,
    })
  }

  const newest = await readAuditLog(discord, { type: "timeouts" })
  const older = await readAuditLog(discord, {
    type: "timeouts",
    before: newest.older,
  })

  expect(kindsOf(newest)).toHaveLength(50)
  expect(sanctionChanges(changesOf(newest)).at(-1)?.reason).toBe("Motif 6")
  expect(older.type).toBe("timeouts")
  expect(older.before).toBe(newest.older)
  expect(older.older).toBeNull()
  expect(new Set(kindsOf(older))).toEqual(new Set(["timeout-lift", "timeout"]))
  expect(sanctionChanges(changesOf(older)).at(-1)?.reason).toBe("Motif 1")
  expect(kindsOf(older)).toHaveLength(10)
})

const UNAVAILABLE = new DiscordError({
  method: "GET",
  route: ROUTES.guildAuditLog,
  status: 503,
})

class FakeDiscordAnsweringOnly extends FakeDiscord {
  answered: { events: AuditLogEvent[]; rules: boolean } | null = null

  override getAuditLog(query: RESTGetAPIAuditLogQuery) {
    const { answered } = this
    return answered === null ||
      (query.action_type !== undefined &&
        answered.events.includes(query.action_type))
      ? super.getAuditLog(query)
      : Promise.reject(UNAVAILABLE)
  }

  override listAutoModerationRules() {
    return this.answered === null || this.answered.rules
      ? super.listAutoModerationRules()
      : Promise.reject(UNAVAILABLE)
  }
}

test.each([
  {
    type: "blocked-words",
    events: [
      AuditLogEvent.AutoModerationRuleCreate,
      AuditLogEvent.AutoModerationRuleUpdate,
    ],
    rules: true,
  },
  {
    type: "timeouts",
    events: [
      AuditLogEvent.MemberUpdate,
      AuditLogEvent.AutoModerationUserCommunicationDisabled,
    ],
    rules: false,
  },
  { type: "kicks", events: [AuditLogEvent.MemberKick], rules: false },
  {
    type: "bans",
    events: [AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberBanRemove],
    rules: false,
  },
])(
  "a page of the type $type asks Discord for that type's entries alone, and for the AutoMod rules only for the blocked words",
  async ({ type, events, rules }) => {
    const discord = new FakeDiscordAnsweringOnly(moderatorState())
    await addEveryKindOfChange(discord)
    discord.answered = { events, rules }

    const page = await readAuditLog(discord, { type })

    expect(changesOf(page)).not.toEqual([])
  }
)

const TORVALD = {
  id: "1400000000000000004",
  username: "torvald_gates",
  global_name: "Torvald",
}

const A_TIMEOUT = { communication_disabled_until: "2026-10-29T14:00:00.000Z" }

async function discordWithAuthorsAndAccounts() {
  const { members = [], ...state } = moderatorState()
  const discord = new FakeDiscord({
    ...state,
    members: [...members, { user: TORVALD }],
  })
  const moderator = await staffMemberOn(discord)
  await addBlockedWord(discord, moderator, form("foo"))
  await changeTimeout(discord, moderator, timeOutForm("Insultes répétées"))
  discord.modifyMemberAs(BRYN.id, LYRA.id, A_TIMEOUT, "Spam")
  discord.removeMemberAs(LYRA.id, TORVALD.id, "Provocations")
  discord.createBanAs(BRYN.id, TORVALD.id, "Retour sous un autre nom")
  return discord
}

function summary(change: AuditLogChange) {
  switch (change.kind) {
    case "rule":
      return `${change.memberName}: ${change.description}`
    case "sanction-change":
      return `${change.memberName}: ${change.sanctionChange.kind} of ${change.account.name}`
    case "automatic-timeout":
      return `${change.memberName}: automatic timeout of ${change.account.name}`
  }
}

function summaries(page: AuditLogPage) {
  return changesOf(page).map(summary)
}

const BAN_BY_BRYN = "Bryn la Rouge: ban of Torvald"
const KICK_BY_LYRA = "Lyra: kick of Torvald"
const TIMEOUT_BY_BRYN = "Bryn la Rouge: timeout of Lyra"
const TIMEOUT_BY_PANEL = "aldis: timeout of Lyra"
const WORD_BY_PANEL = "aldis: Ajout de « foo », action « Bloquer seulement »"

test("with no author and no account, every change shows", async () => {
  const discord = await discordWithAuthorsAndAccounts()

  const page = await readAuditLog(discord, {})

  expect(page.author).toBeNull()
  expect(page.account).toBeNull()
  expect(summaries(page)).toEqual([
    BAN_BY_BRYN,
    KICK_BY_LYRA,
    TIMEOUT_BY_BRYN,
    TIMEOUT_BY_PANEL,
    WORD_BY_PANEL,
  ])
})

test.each([
  ["bryn", [BAN_BY_BRYN, TIMEOUT_BY_BRYN]],
  ["BRYN LA R", [BAN_BY_BRYN, TIMEOUT_BY_BRYN]],
  ["ALD", [TIMEOUT_BY_PANEL, WORD_BY_PANEL]],
  ["lyra", [KICK_BY_LYRA]],
  ["la rouge", []],
  ["torvald", []],
])(
  "an author's text %j keeps the changes whose author's name starts with it, whatever its case, the name the panel's reason gives for a change made through the panel and Discord's for the others",
  async (author, expected) => {
    const discord = await discordWithAuthorsAndAccounts()

    const page = await readAuditLog(discord, { author })

    expect(page.author).toBe(author)
    expect(summaries(page)).toEqual(expected)
  }
)

test.each([
  [BRYN.id, [BAN_BY_BRYN, TIMEOUT_BY_BRYN]],
  [`<@${BRYN.id}>`, [BAN_BY_BRYN, TIMEOUT_BY_BRYN]],
  [`<@!${BRYN.id}>`, [BAN_BY_BRYN, TIMEOUT_BY_BRYN]],
  [ALDIS.id, [TIMEOUT_BY_PANEL, WORD_BY_PANEL]],
  [`<@${LYRA.id}>`, [KICK_BY_LYRA]],
  [TORVALD.id, []],
  ["1400000000000000099", []],
])(
  "an author's ID or mention %j keeps the changes made by exactly that account, the ID the panel's reason gives for a change made through the panel and Discord's for the others",
  async (author, expected) => {
    const discord = await discordWithAuthorsAndAccounts()

    expect(summaries(await readAuditLog(discord, { author }))).toEqual(expected)
  }
)

test("an author who no longer holds the staff role, or no longer is on the Discord server, is filtered like any other", async () => {
  const discord = await discordWithAuthorsAndAccounts()
  discord.removeMemberRole(BRYN.id, STAFF_ROLE_ID)
  discord.removeMemberAs(BRYN.id, ALDIS.id, "Départ")

  const bryn = await readAuditLog(discord, { author: "bryn" })
  const aldisByName = await readAuditLog(discord, { author: "ald" })
  const aldisById = await readAuditLog(discord, { author: ALDIS.id })

  expect(summaries(bryn)).toEqual([
    "Bryn la Rouge: kick of aldis",
    BAN_BY_BRYN,
    TIMEOUT_BY_BRYN,
  ])
  expect(summaries(aldisByName)).toEqual([TIMEOUT_BY_PANEL, WORD_BY_PANEL])
  expect(summaries(aldisById)).toEqual([TIMEOUT_BY_PANEL, WORD_BY_PANEL])
})

test("a change whose author or account the audit log does not name is found by ID, and never by the « Membre inconnu » or « Compte inconnu » that stands in for the name", async () => {
  const discord = new FakeDiscord({
    members: [{ user: BRYN }],
    auditLogEntries: [
      {
        id: "1563530499194880000",
        action_type: AuditLogEvent.MemberKick,
        target_id: "1400000000000000099",
        user_id: BRYN.id,
      },
      {
        id: "1563530499194880001",
        action_type: AuditLogEvent.MemberKick,
        target_id: BRYN.id,
        user_id: "1400000000000000098",
      },
    ],
  })
  const kickOfUnknown = "Bryn la Rouge: kick of Compte inconnu"
  const kickByUnknown = "Membre inconnu: kick of Bryn la Rouge"

  expect(summaries(await readAuditLog(discord, {}))).toEqual([
    kickByUnknown,
    kickOfUnknown,
  ])
  expect(summaries(await readAuditLog(discord, { author: "membre" }))).toEqual(
    []
  )
  expect(
    summaries(await readAuditLog(discord, { author: "1400000000000000098" }))
  ).toEqual([kickByUnknown])
  expect(summaries(await readAuditLog(discord, { account: "compte" }))).toEqual(
    []
  )
  expect(
    summaries(await readAuditLog(discord, { account: "1400000000000000099" }))
  ).toEqual([kickOfUnknown])
})

test.each([
  ["lyra", [TIMEOUT_BY_BRYN, TIMEOUT_BY_PANEL]],
  ["LY", [TIMEOUT_BY_BRYN, TIMEOUT_BY_PANEL]],
  [LYRA.id, [TIMEOUT_BY_BRYN, TIMEOUT_BY_PANEL]],
  [`<@${LYRA.id}>`, [TIMEOUT_BY_BRYN, TIMEOUT_BY_PANEL]],
  [`<@!${LYRA.id}>`, [TIMEOUT_BY_BRYN, TIMEOUT_BY_PANEL]],
  ["tor", [BAN_BY_BRYN, KICK_BY_LYRA]],
  [TORVALD.id, [BAN_BY_BRYN, KICK_BY_LYRA]],
  ["torvald_g", []],
  ["ald", []],
  [ALDIS.id, []],
])(
  "an account's text or ID %j keeps the changes that target an account whose name, as the row shows it, starts with it, or that has exactly that ID, and none of the changes to the blocked words, which target no account",
  async (account, expected) => {
    const discord = await discordWithAuthorsAndAccounts()

    const page = await readAuditLog(discord, { account })

    expect(page.account).toBe(account)
    expect(summaries(page)).toEqual(expected)
  }
)

test("an author, an account and a type combine, and keep only the changes that meet all three", async () => {
  const discord = await discordWithAuthorsAndAccounts()

  expect(
    summaries(await readAuditLog(discord, { author: "bryn", account: "lyra" }))
  ).toEqual([TIMEOUT_BY_BRYN])
  expect(
    summaries(
      await readAuditLog(discord, { author: "bryn", account: TORVALD.id })
    )
  ).toEqual([BAN_BY_BRYN])
  expect(
    summaries(
      await readAuditLog(discord, {
        author: "bryn",
        account: "tor",
        type: "timeouts",
      })
    )
  ).toEqual([])
  expect(
    summaries(
      await readAuditLog(discord, {
        author: ALDIS.id,
        account: "lyra",
        type: "timeouts",
      })
    )
  ).toEqual([TIMEOUT_BY_PANEL])
  expect(
    summaries(
      await readAuditLog(discord, { author: "ald", type: "blocked-words" })
    )
  ).toEqual([WORD_BY_PANEL])
  expect(
    summaries(
      await readAuditLog(discord, { account: "lyra", type: "blocked-words" })
    )
  ).toEqual([])
})

test("a filter finds a change far beyond the first 100 entries Discord gives of its type", async () => {
  const discord = await discordWithAuthorsAndAccounts()
  discord.modifyMemberAs(ALDIS.id, BRYN.id, A_TIMEOUT, "Premier")
  for (let index = 1; index <= 105; index++) {
    discord.modifyMemberAs(LYRA.id, ALDIS.id, A_TIMEOUT, `Motif ${index}`)
  }

  const byAccount = await readAuditLog(discord, {
    account: BRYN.id,
    type: "timeouts",
  })
  const byAuthor = await readAuditLog(discord, {
    author: "ald",
    type: "timeouts",
  })

  expect(summaries(byAccount)).toEqual(["aldis: timeout of Bryn la Rouge"])
  expect(summaries(byAuthor)).toEqual([
    "aldis: timeout of Bryn la Rouge",
    TIMEOUT_BY_PANEL,
  ])
})

test("a filter's page holds its 50 newest changes, and its cursor leads to the older ones, still under that filter", async () => {
  const discord = discordWithModerator()
  for (let index = 1; index <= 60; index++) {
    discord.modifyMemberAs(BRYN.id, LYRA.id, A_TIMEOUT, `Motif ${index}`)
    discord.modifyMemberAs(ALDIS.id, LYRA.id, A_TIMEOUT, `Autre ${index}`)
  }

  const newest = await readAuditLog(discord, { author: "bryn" })
  const older = await readAuditLog(discord, {
    author: "bryn",
    before: newest.older,
  })

  expect(newest.author).toBe("bryn")
  expect(changesOf(newest)).toHaveLength(50)
  expect(sanctionChanges(changesOf(newest))[0]?.reason).toBe("Motif 60")
  expect(sanctionChanges(changesOf(newest)).at(-1)?.reason).toBe("Motif 11")
  expect(older.author).toBe("bryn")
  expect(older.before).toBe(newest.older)
  expect(changesOf(older)).toHaveLength(10)
  expect(sanctionChanges(changesOf(older))[0]?.reason).toBe("Motif 10")
  expect(sanctionChanges(changesOf(older)).at(-1)?.reason).toBe("Motif 1")
  expect(older.older).toBeNull()
})

test("an author or an account that is empty, blank, repeated or not a text counts as absent, and the others lose the spaces around them", async () => {
  const discord = await discordWithAuthorsAndAccounts()

  for (const value of [undefined, "", "   ", ["bryn", "ald"], 42, null]) {
    const page = await readAuditLog(discord, { author: value, account: value })
    expect(page.author).toBeNull()
    expect(page.account).toBeNull()
    expect(changesOf(page)).toHaveLength(5)
  }
  const page = await readAuditLog(discord, {
    author: "  bryn ",
    account: ` <@${LYRA.id}> `,
  })
  expect(page.author).toBe("bryn")
  expect(page.account).toBe(`<@${LYRA.id}>`)
  expect(summaries(page)).toEqual([TIMEOUT_BY_BRYN])
})

test.each([
  {
    filters: { account: LYRA.id },
    events: [
      AuditLogEvent.MemberUpdate,
      AuditLogEvent.AutoModerationUserCommunicationDisabled,
      AuditLogEvent.MemberKick,
      AuditLogEvent.MemberBanAdd,
      AuditLogEvent.MemberBanRemove,
    ],
  },
  { filters: { account: LYRA.id, type: "blocked-words" }, events: [] },
])(
  "a page filtered by an account asks Discord for no entry of the panel's rules, nor for the AutoMod rules, since no such change targets an account: $filters",
  async ({ filters, events }) => {
    const discord = new FakeDiscordAnsweringOnly(moderatorState())
    await addEveryKindOfChange(discord)
    discord.answered = { events, rules: false }

    const page = await readAuditLog(discord, filters)

    expect(page.account).toBe(LYRA.id)
    expect(changesOf(page).length > 0).toBe(events.length > 0)
  }
)

async function discordWithAnAutomaticTimeout() {
  const discord = await discordWithAuthorsAndAccounts()
  const insults = discord.createAutoModerationRuleAs(BRYN.id, INSULTS_RULE)
  discord.timeOutByAutoModeration(insults.id, LYRA.id)
  return discord
}

const AUTOMOD_TIMEOUT_OF_LYRA = "AutoMod: automatic timeout of Lyra"

test.each([
  ["auto", [AUTOMOD_TIMEOUT_OF_LYRA]],
  ["AUTOMOD", [AUTOMOD_TIMEOUT_OF_LYRA]],
  ["Au", [AUTOMOD_TIMEOUT_OF_LYRA]],
  ["utomod", []],
  ["lyra", [KICK_BY_LYRA]],
  [LYRA.id, [KICK_BY_LYRA]],
  [`<@${LYRA.id}>`, [KICK_BY_LYRA]],
])(
  "an author's text or ID %j keeps AutoMod's timeout for a text that « AutoMod » starts with, whatever its case, and never for the name, the ID or the mention of the member it timed out",
  async (author, expected) => {
    const discord = await discordWithAnAutomaticTimeout()

    expect(summaries(await readAuditLog(discord, { author }))).toEqual(expected)
  }
)

test.each([["lyra"], ["LY"], [LYRA.id], [`<@${LYRA.id}>`], [`<@!${LYRA.id}>`]])(
  "an account's text or ID %j keeps AutoMod's timeout of that account, as it does any sanction",
  async (account) => {
    const discord = await discordWithAnAutomaticTimeout()

    expect(summaries(await readAuditLog(discord, { account }))).toEqual([
      AUTOMOD_TIMEOUT_OF_LYRA,
      TIMEOUT_BY_BRYN,
      TIMEOUT_BY_PANEL,
    ])
  }
)

test("AutoMod's timeout of an account is not among the changes of another account", async () => {
  const discord = await discordWithAnAutomaticTimeout()

  expect(summaries(await readAuditLog(discord, { account: "tor" }))).toEqual([
    BAN_BY_BRYN,
    KICK_BY_LYRA,
  ])
})

test("an author, an account and a type keep AutoMod's timeout only when it meets all three", async () => {
  const discord = await discordWithAnAutomaticTimeout()
  const found = [AUTOMOD_TIMEOUT_OF_LYRA]

  for (const [filters, expected] of [
    [{ author: "auto", account: "lyra" }, found],
    [{ author: "auto", account: LYRA.id, type: "timeouts" }, found],
    [{ author: "auto", type: "timeouts" }, found],
    [
      { account: "lyra", type: "timeouts" },
      [...found, TIMEOUT_BY_BRYN, TIMEOUT_BY_PANEL],
    ],
    [{ author: "auto", account: "tor" }, []],
    [{ author: "auto", type: "kicks" }, []],
    [{ author: "auto", type: "blocked-words" }, []],
    [{ author: "bryn", account: "lyra", type: "timeouts" }, [TIMEOUT_BY_BRYN]],
  ] as const) {
    expect(summaries(await readAuditLog(discord, filters))).toEqual(expected)
  }
})

test("a timeout from the rule of a blocked word tied to a timeout shows as AutoMod's under the panel rule's name, as one from a rule made in Discord does", async () => {
  const discord = discordWhereLyraHasAnAvatar()
  await addBlockedWord(
    discord,
    await staffMemberOn(discord),
    form("foo", "timeout-1h")
  )
  const [panelRule] = await discord.listAutoModerationRules()
  discord.timeOutByAutoModeration(panelRule?.id ?? "", LYRA.id)

  const changes = changesOf(await readAuditLog(discord, {}))

  expect(automaticTimeouts(changes)).toEqual([
    {
      ...AUTOMOD_TIMES_OUT_LYRA,
      ruleName: "Mots interdits du panel · exclusion 1 heure",
    },
  ])
})

const AUTOMATIC_TIMEOUT_ENTRY = {
  action_type: AuditLogEvent.AutoModerationUserCommunicationDisabled,
  user_id: LYRA.id,
}

test("an AutoMod timeout whose entry names no rule shows its account alone, and one that names no account is left out", async () => {
  const discord = new FakeDiscord({
    members: [{ user: LYRA }],
    auditLogEntries: [
      {
        ...AUTOMATIC_TIMEOUT_ENTRY,
        id: "1563530499194880000",
        target_id: LYRA.id,
      },
      {
        ...AUTOMATIC_TIMEOUT_ENTRY,
        id: "1563530499194880001",
        target_id: null,
      },
    ],
  })

  expect(automaticTimeouts(changesOf(await readAuditLog(discord, {})))).toEqual(
    [{ ...AUTOMOD_TIMES_OUT_LYRA, ruleName: null }]
  )
})

test("an AutoMod timeout of an account the audit log does not name shows it as « Compte inconnu », found by its ID alone", async () => {
  const discord = new FakeDiscord({
    members: [{ user: BRYN }],
    auditLogEntries: [
      {
        ...AUTOMATIC_TIMEOUT_ENTRY,
        id: "1563530499194880000",
        target_id: "1400000000000000099",
        user_id: "1400000000000000099",
      },
    ],
  })
  const unknown = "AutoMod: automatic timeout of Compte inconnu"

  expect(summaries(await readAuditLog(discord, {}))).toEqual([unknown])
  expect(summaries(await readAuditLog(discord, { account: "compte" }))).toEqual(
    []
  )
  expect(
    summaries(await readAuditLog(discord, { account: "1400000000000000099" }))
  ).toEqual([unknown])
})

test("a page of timeouts holds the 50 newest of the staff's and of AutoMod's together, and its cursor leads to the older ones", async () => {
  const discord = discordWhereLyraHasAnAvatar()
  const insults = discord.createAutoModerationRuleAs(BRYN.id, INSULTS_RULE)
  for (let index = 1; index <= 30; index++) {
    discord.modifyMemberAs(BRYN.id, LYRA.id, A_TIMEOUT, `Motif ${index}`)
    discord.timeOutByAutoModeration(insults.id, LYRA.id)
  }

  const newest = await readAuditLog(discord, { type: "timeouts" })
  const older = await readAuditLog(discord, {
    type: "timeouts",
    before: newest.older,
  })

  expect(kindsOf(newest)).toHaveLength(50)
  expect(kindsOf(newest).filter((kind) => kind === "timeout")).toHaveLength(25)
  expect(older.older).toBeNull()
  expect(kindsOf(older)).toEqual(
    Array.from({ length: 5 }, () => ["automatic-timeout", "timeout"]).flat()
  )
})
