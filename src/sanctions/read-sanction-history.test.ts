import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type APIAutoModerationRule,
} from "discord-api-types/v10"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { readRecord } from "@/records/read-record"
import { findStaffMember } from "@/staff/staff-member"
import { changeTimeout } from "./change-timeout"
import { readSanctionHistory } from "./read-sanction-history"

const NOW = new Date("2026-10-28T14:00:00.000Z")

const STAFF = { id: "1300000000000000000", name: "Staff", position: 6 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 5,
}

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 3 }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = {
  id: "1400000000000000002",
  username: "bryn",
  global_name: "Bryn la Rouge",
}

const LYRA = {
  id: "1400000000000000003",
  username: "lyra",
  global_name: "Lyra",
}

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const INSULTS_RULE: APIAutoModerationRule = {
  id: "1500000000000000001",
  guild_id: "1100000000000000000",
  name: "Insultes",
  creator_id: BRYN.id,
  event_type: AutoModerationRuleEventType.MessageSend,
  trigger_type: AutoModerationRuleTriggerType.Keyword,
  trigger_metadata: { keyword_filter: ["crétin"] },
  actions: [
    {
      type: AutoModerationActionType.Timeout,
      metadata: { duration_seconds: 600 },
    },
  ],
  enabled: true,
  exempt_roles: [],
  exempt_channels: [],
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function discordWithLyra() {
  return new FakeDiscord({
    roles: [STAFF, MODERATION, PANEL, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
      { user: BRYN, roles: [STAFF.id, MODERATION.id] },
      { user: LYRA, roles: [GUARD.id] },
      { user: HALDOR, roles: [GUARD.id] },
    ],
    autoModerationRules: [INSULTS_RULE],
  })
}

async function moderatorOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF.id,
      moderationRoleIds: [MODERATION.id],
      banRoleIds: [],
    },
    ALDIS.id
  )
  if (staffMember === null) {
    throw new Error("Aldis is no staff member")
  }
  return staffMember
}

function timeOutForm(reason: string) {
  const data = new FormData()
  data.set("change", "time-out")
  data.set("userId", LYRA.id)
  data.set("duration", "3600")
  data.set("reason", reason)
  return data
}

function liftForm(reason: string) {
  const data = new FormData()
  data.set("change", "lift")
  data.set("userId", LYRA.id)
  data.set("reason", reason)
  return data
}

async function historyOf(discord: FakeDiscord, userId: string) {
  return await readSanctionHistory(discord, await readRecord(discord, userId))
}

test("a timeout given through the panel shows its end, its reason and its staff member, as given through the panel", async () => {
  const discord = discordWithLyra()
  await changeTimeout(
    discord,
    await moderatorOn(discord),
    timeOutForm("Insultes répétées")
  )

  expect(await historyOf(discord, LYRA.id)).toEqual([
    {
      id: expect.any(String),
      date: NOW,
      change: { kind: "timeout", end: new Date("2026-10-28T15:00:00.000Z") },
      author: { kind: "panel", staffMemberName: "aldis" },
      reason: "Insultes répétées",
    },
  ])
})

test("a timeout lifted through the panel shows as lifted, newest first", async () => {
  const discord = discordWithLyra()
  const moderator = await moderatorOn(discord)
  await changeTimeout(discord, moderator, timeOutForm("Insultes répétées"))
  const lifted = new Date("2026-10-28T14:20:00.000Z")
  vi.setSystemTime(lifted)
  await changeTimeout(discord, moderator, liftForm("Erreur de cible"))

  expect(await historyOf(discord, LYRA.id)).toEqual([
    {
      id: expect.any(String),
      date: lifted,
      change: { kind: "timeout-lift" },
      author: { kind: "panel", staffMemberName: "aldis" },
      reason: "Erreur de cible",
    },
    expect.objectContaining({
      date: NOW,
      change: { kind: "timeout", end: new Date("2026-10-28T15:00:00.000Z") },
    }),
  ])
})

test("a timeout given then lifted by hand in Discord shows under its author's Discord name, as given in Discord, with its reason if any", async () => {
  const discord = discordWithLyra()
  discord.modifyMemberAs(
    BRYN.id,
    LYRA.id,
    { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
    "Spam"
  )
  discord.modifyMemberAs(BRYN.id, LYRA.id, {
    communication_disabled_until: null,
  })

  expect(await historyOf(discord, LYRA.id)).toEqual([
    {
      id: expect.any(String),
      date: NOW,
      change: { kind: "timeout-lift" },
      author: { kind: "discord", memberName: "Bryn la Rouge" },
      reason: null,
    },
    {
      id: expect.any(String),
      date: NOW,
      change: { kind: "timeout", end: new Date("2026-10-29T14:00:00.000Z") },
      author: { kind: "discord", memberName: "Bryn la Rouge" },
      reason: "Spam",
    },
  ])
})

test("only the account's own sanctions show, and no change of a member but their timeout", async () => {
  const discord = discordWithLyra()
  discord.modifyMemberAs(BRYN.id, HALDOR.id, {
    communication_disabled_until: "2026-10-29T14:00:00.000Z",
  })
  discord.modifyMemberAs(BRYN.id, LYRA.id, { nick: "Lyra des Brumes" })

  expect(await historyOf(discord, LYRA.id)).toEqual([])
  expect(await historyOf(discord, HALDOR.id)).toHaveLength(1)
})

test("a kick, a ban and its lifting made by hand in Discord show on the record of an account that is no longer a member", async () => {
  const discord = discordWithLyra()
  discord.removeMemberAs(BRYN.id, LYRA.id, "Provocations")
  vi.setSystemTime(new Date("2026-10-28T14:10:00.000Z"))
  discord.createBanAs(BRYN.id, LYRA.id, "Retour sous un autre nom")
  vi.setSystemTime(new Date("2026-10-28T14:20:00.000Z"))
  discord.removeBanAs(BRYN.id, LYRA.id)

  expect(await historyOf(discord, LYRA.id)).toEqual([
    {
      id: expect.any(String),
      date: new Date("2026-10-28T14:20:00.000Z"),
      change: { kind: "ban-lift" },
      author: { kind: "discord", memberName: "Bryn la Rouge" },
      reason: null,
    },
    {
      id: expect.any(String),
      date: new Date("2026-10-28T14:10:00.000Z"),
      change: { kind: "ban" },
      author: { kind: "discord", memberName: "Bryn la Rouge" },
      reason: "Retour sous un autre nom",
    },
    {
      id: expect.any(String),
      date: NOW,
      change: { kind: "kick" },
      author: { kind: "discord", memberName: "Bryn la Rouge" },
      reason: "Provocations",
    },
  ])
})

test("an account still banned shows its ban", async () => {
  const discord = discordWithLyra()
  discord.createBanAs(BRYN.id, LYRA.id, "Menaces")

  expect(await historyOf(discord, LYRA.id)).toEqual([
    expect.objectContaining({ change: { kind: "ban" }, reason: "Menaces" }),
  ])
})

test("a timeout from AutoMod shows as AutoMod's, with its rule's name and no reason", async () => {
  const discord = discordWithLyra()
  discord.timeOutByAutoModeration(INSULTS_RULE.id, LYRA.id)

  expect(await historyOf(discord, LYRA.id)).toEqual([
    {
      id: expect.any(String),
      date: NOW,
      change: { kind: "timeout", end: null },
      author: { kind: "auto-moderation", ruleName: "Insultes" },
      reason: null,
    },
  ])
})

test("a sanction behind more than a page of Discord's audit log still shows", async () => {
  const discord = discordWithLyra()
  discord.modifyMemberAs(BRYN.id, LYRA.id, {
    communication_disabled_until: "2026-10-29T14:00:00.000Z",
  })
  for (let count = 0; count < 250; count += 1) {
    discord.modifyMemberAs(BRYN.id, HALDOR.id, { nick: `Haldor ${count}` })
  }

  expect(await historyOf(discord, LYRA.id)).toEqual([
    expect.objectContaining({
      change: { kind: "timeout", end: new Date("2026-10-29T14:00:00.000Z") },
    }),
  ])
})

test("an ID that names no account has no history", async () => {
  expect(await historyOf(discordWithLyra(), "1400000000000000099")).toBeNull()
})

test("a sanction whose author Discord no longer knows shows under « Membre inconnu »", async () => {
  const discord = new FakeDiscord({
    members: [{ user: LYRA }],
    auditLogEntries: [
      {
        id: "1500000000000000010",
        action_type: AuditLogEvent.MemberKick,
        target_id: LYRA.id,
        user_id: "1400000000000000099",
      },
    ],
  })

  expect(await historyOf(discord, LYRA.id)).toEqual([
    expect.objectContaining({
      change: { kind: "kick" },
      author: { kind: "discord", memberName: "Membre inconnu" },
      reason: null,
    }),
  ])
})
