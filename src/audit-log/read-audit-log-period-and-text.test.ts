import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, onTestFinished, test, vi } from "vitest"

import { addBlockedWord } from "@/blocked-words/add-blocked-word"
import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { additionReason } from "@/blocked-words/blocked-word-reason"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { changeTimeout } from "@/sanctions/change-timeout"
import { findStaffMember } from "@/staff/staff-member"
import { capitalized } from "./action-change-entries"
import { readAuditLog, type AuditLogPage } from "./read-audit-log"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const PANEL_ROLE = {
  id: "1300000000000000021",
  name: "Shor Panel",
  position: 3,
}

const GUARD_ROLE = { id: "1300000000000000010", name: "Garde", position: 1 }

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

const TORVALD = { id: "1400000000000000004", username: "torvald" }

const NOW = new Date("2026-10-28T14:00:00.000Z")

const A_TIMEOUT = { communication_disabled_until: "2026-10-29T14:00:00.000Z" }

function freezeTime() {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

function discordWithModerator() {
  return new FakeDiscord({
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 6 },
      { id: MODERATION_ROLE_ID, name: "Modération", position: 5 },
      PANEL_ROLE,
      GUARD_ROLE,
    ],
    applicationRoles: [PANEL_ROLE.id],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
      { user: LYRA, roles: [GUARD_ROLE.id] },
      { user: TORVALD },
    ],
  })
}

async function moderatorOn(discord: FakeDiscord) {
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

function wordForm(word: string, action = "block") {
  const data = new FormData()
  data.set("word", word)
  data.set("action", action)
  return data
}

function timeOutForm(reason: string) {
  const data = new FormData()
  data.set("change", "time-out")
  data.set("userId", LYRA.id)
  data.set("duration", "3600")
  data.set("reason", reason)
  return data
}

function shown(page: AuditLogPage) {
  return page.days.flatMap(({ changes }) =>
    changes.map((change) => {
      switch (change.kind) {
        case "rule":
          return change.description
        case "sanction-change":
          return `${change.memberName}: ${change.reason ?? "(no reason)"}`
        case "automatic-timeout":
          return `AutoMod: ${change.ruleName ?? "(no rule)"}`
      }
    })
  )
}

function timeOutAt(moment: string, reason: string, discord: FakeDiscord) {
  vi.setSystemTime(new Date(moment))
  discord.modifyMemberAs(BRYN.id, LYRA.id, A_TIMEOUT, reason)
  vi.setSystemTime(NOW)
}

function discordWithFourDays() {
  freezeTime()
  const discord = discordWithModerator()
  timeOutAt("2026-10-20T21:59:59.999Z", "Veille", discord)
  timeOutAt("2026-10-20T22:00:00.000Z", "Début", discord)
  timeOutAt("2026-10-21T21:59:59.999Z", "Fin", discord)
  timeOutAt("2026-10-21T22:00:00.000Z", "Lendemain", discord)
  return discord
}

const BRYN_ON = (reason: string) => `Bryn la Rouge: ${reason}`

test.each([
  [{}, ["Lendemain", "Fin", "Début", "Veille"]],
  [{ from: "2026-10-21" }, ["Lendemain", "Fin", "Début"]],
  [{ to: "2026-10-21" }, ["Fin", "Début", "Veille"]],
  [{ from: "2026-10-21", to: "2026-10-21" }, ["Fin", "Début"]],
  [{ from: "2026-10-21", to: "2026-10-22" }, ["Lendemain", "Fin", "Début"]],
  [{ from: "2026-10-22" }, ["Lendemain"]],
  [{ from: "2026-10-23" }, []],
  [{ to: "2026-10-19" }, []],
])(
  "the period %j keeps the changes made from the first midnight of its first day of Paris to the last midnight of its last, both included",
  async (period, reasons) => {
    const discord = discordWithFourDays()

    const page = await readAuditLog(discord, period)

    expect(shown(page)).toEqual(reasons.map(BRYN_ON))
  }
)

test("a page carries the period it was read under, and its cursor leads to the older changes of that period alone", async () => {
  freezeTime()
  const discord = discordWithModerator()
  timeOutAt("2026-10-20T10:00:00.000Z", "Hors période", discord)
  for (let index = 1; index <= 60; index++) {
    timeOutAt("2026-10-21T10:00:00.000Z", `Motif ${index}`, discord)
  }
  timeOutAt("2026-10-22T10:00:00.000Z", "Hors période", discord)

  const newest = await readAuditLog(discord, {
    from: "2026-10-21",
    to: "2026-10-21",
  })
  const older = await readAuditLog(discord, {
    from: "2026-10-21",
    to: "2026-10-21",
    before: newest.older,
  })

  expect(newest).toMatchObject({ from: "2026-10-21", to: "2026-10-21" })
  expect(shown(newest)).toHaveLength(50)
  expect(shown(newest)[0]).toBe(BRYN_ON("Motif 60"))
  expect(shown(newest).at(-1)).toBe(BRYN_ON("Motif 11"))
  expect(older).toMatchObject({ from: "2026-10-21", to: "2026-10-21" })
  expect(shown(older)).toEqual(
    Array.from({ length: 10 }, (_, index) => BRYN_ON(`Motif ${10 - index}`))
  )
  expect(older.older).toBeNull()
})

test.each([
  ["absent", undefined],
  ["empty", ""],
  ["a date that does not exist", "2026-02-30"],
  ["a date written with a slash", "2026/10/21"],
  ["a date given twice", ["2026-10-21", "2026-10-22"]],
  ["a number", 20261021],
])(
  "a period bound that is %s counts as absent, and every change shows",
  async (_, value) => {
    const discord = discordWithFourDays()

    const page = await readAuditLog(discord, { from: value, to: value })

    expect(page).toMatchObject({ from: null, to: null })
    expect(shown(page)).toHaveLength(4)
  }
)

test.each([
  ["no period", {}, "within"],
  ["a period today", { from: "2026-10-28", to: "2026-10-28" }, "within"],
  ["a period up to today", { from: "2026-10-01" }, "within"],
  [
    "a period that starts on the oldest day kept",
    { from: "2026-09-13" },
    "within",
  ],
  ["a period that ends on the oldest day kept", { to: "2026-09-13" }, "within"],
  [
    "a period that starts the day before the oldest day kept",
    { from: "2026-09-12", to: "2026-10-20" },
    "starts-before-retention",
  ],
  [
    "a period that starts years before",
    { from: "2020-01-01" },
    "starts-before-retention",
  ],
  [
    "a period that ends the day before the oldest day kept",
    { from: "2026-08-01", to: "2026-09-12" },
    "outside-retention",
  ],
  ["a period in the past", { to: "2026-01-01" }, "outside-retention"],
  [
    "a period that starts tomorrow",
    { from: "2026-10-29" },
    "outside-retention",
  ],
  [
    "a period that ends before it starts",
    { from: "2026-10-22", to: "2026-10-21" },
    "reversed",
  ],
  [
    "a period that ends before it starts, and lies in the past",
    { from: "2026-01-02", to: "2026-01-01" },
    "reversed",
  ],
])("%s reaches %s", async (_, period, reach) => {
  const discord = discordWithFourDays()

  const page = await readAuditLog(discord, period)

  expect(page.periodReach).toBe(reach)
})

test.each([
  ["a period that lies outside the 45 days", { to: "2026-01-01" }],
  ["a period in the future", { from: "2026-11-01" }],
  [
    "a period that ends before it starts",
    { from: "2026-10-22", to: "2026-10-21" },
  ],
])("%s shows no change and asks Discord for none", async (_, period) => {
  const discord = discordWithFourDays()
  discord.failNext(
    "getAuditLog",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildAuditLog,
      status: 503,
    })
  )

  const page = await readAuditLog(discord, period)

  expect(shown(page)).toEqual([])
  expect(page.older).toBeNull()
})

async function discordWithReasons() {
  freezeTime()
  const discord = discordWithModerator()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, wordForm("free nitro"))
  await changeTimeout(discord, moderator, timeOutForm("Insultes répétées"))
  discord.modifyMemberAs(BRYN.id, LYRA.id, A_TIMEOUT, "Spam dans #général")
  discord.modifyMemberAs(BRYN.id, LYRA.id, A_TIMEOUT)
  discord.removeMemberAs(LYRA.id, TORVALD.id, "Provocations")
  discord.createBanAs(BRYN.id, TORVALD.id, "Retour sous un autre nom")
  return discord
}

const WORD = capitalized(
  additionReason("free nitro", blockedWordAction("block"))
)
const INSULTS = "aldis: Insultes répétées"
const SPAM = "Bryn la Rouge: Spam dans #général"
const NO_REASON = "Bryn la Rouge: (no reason)"
const KICK = "Lyra: Provocations"
const BAN = "Bryn la Rouge: Retour sous un autre nom"

test.each([
  ["nitro", [WORD]],
  ["FREE NITRO", [WORD]],
  ["free  nitro", []],
  ["« free nitro »", [WORD]],
  ["ajout de", [WORD]],
  ["bloquer seulement", [WORD]],
  ["insultes", [INSULTS]],
  ["répét", [INSULTS]],
  ["repet", []],
  ["Spam", [SPAM]],
  ["#général", [SPAM]],
  ["provocations", [KICK]],
  ["autre nom", [BAN]],
  ["lyra", []],
  ["Bryn", []],
  ["introuvable", []],
])(
  "the text %j finds the words of a motif, whatever its case and not its accents, wherever they sit in it",
  async (text, expected) => {
    const discord = await discordWithReasons()

    expect(shown(await readAuditLog(discord, { text }))).toEqual(expected)
  }
)

test("a text is found in the reason of a sanction made in Discord as in one made through the panel, and a change with no reason is found by none", async () => {
  const discord = await discordWithReasons()

  const everyReason = await readAuditLog(discord, { text: "s" })

  expect(shown(everyReason)).toEqual([BAN, KICK, SPAM, INSULTS, WORD])
  expect(shown(everyReason)).not.toContain(NO_REASON)
  expect(
    shown(await readAuditLog(discord, { text: "s", type: "timeouts" }))
  ).toEqual([SPAM, INSULTS])
})

test("the text finds the name of the rule that gave AutoMod's timeout, which stands for its reason, and nothing of the member it timed out", async () => {
  const discord = await discordWithReasons()
  const insults = discord.createAutoModerationRuleAs(BRYN.id, {
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
  })
  discord.timeOutByAutoModeration(insults.id, LYRA.id)

  expect(shown(await readAuditLog(discord, { text: "insultes" }))).toEqual([
    "AutoMod: Insultes",
    INSULTS,
  ])
  expect(shown(await readAuditLog(discord, { text: "lyra" }))).toEqual([])
})

test("a change made in Discord to the panel's rule shows no word, so that no text finds it", async () => {
  const discord = await discordWithReasons()
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, rule?.id ?? "", {
    enabled: false,
  })

  const everyChange = await readAuditLog(discord, {})

  expect(shown(everyChange)).toContain("Règle modifiée dans Discord")
  for (const text of ["discord", "règle", "free nitro"]) {
    expect(shown(await readAuditLog(discord, { text }))).not.toContain(
      "Règle modifiée dans Discord"
    )
  }
})

test("the text, the period, the type, the author and the account combine, and keep only the changes that meet every one", async () => {
  const discord = discordWithFourDays()
  discord.modifyMemberAs(ALDIS.id, LYRA.id, A_TIMEOUT, "Fin de partie")
  discord.removeMemberAs(BRYN.id, TORVALD.id, "Fin des provocations")

  const todayAnd = (filters: Parameters<typeof readAuditLog>[1]) =>
    readAuditLog(discord, { from: "2026-10-28", ...filters })

  expect(shown(await todayAnd({ text: "fin" }))).toEqual([
    "Bryn la Rouge: Fin des provocations",
    "aldis: Fin de partie",
  ])
  expect(shown(await todayAnd({ text: "fin", type: "kicks" }))).toEqual([
    "Bryn la Rouge: Fin des provocations",
  ])
  expect(shown(await todayAnd({ text: "fin", author: "ald" }))).toEqual([
    "aldis: Fin de partie",
  ])
  expect(shown(await todayAnd({ text: "fin", account: "torv" }))).toEqual([
    "Bryn la Rouge: Fin des provocations",
  ])
  expect(
    shown(
      await readAuditLog(discord, {
        text: "fin",
        from: "2026-10-21",
        to: "2026-10-21",
      })
    )
  ).toEqual([BRYN_ON("Fin")])
  expect(shown(await todayAnd({ text: "début" }))).toEqual([])
})

test.each([
  ["absent", undefined],
  ["empty", ""],
  ["blank", "   "],
  ["given twice", ["spam", "nitro"]],
  ["a number", 42],
  ["more than the 512 characters a reason holds", "a".repeat(513)],
])(
  "a text that is %s counts as absent, and every change shows",
  async (_, text) => {
    const discord = await discordWithReasons()

    const page = await readAuditLog(discord, { text })

    expect(page.text).toBeNull()
    expect(shown(page)).toHaveLength(6)
  }
)

test("a text loses the spaces around it", async () => {
  const discord = await discordWithReasons()

  const page = await readAuditLog(discord, { text: "  spam " })

  expect(page.text).toBe("spam")
  expect(shown(page)).toEqual([SPAM])
})

test("a text finds a change far beyond the first 100 entries Discord gives of its type", async () => {
  const discord = await discordWithReasons()
  for (let index = 1; index <= 105; index++) {
    discord.modifyMemberAs(BRYN.id, ALDIS.id, A_TIMEOUT, `Motif ${index}`)
  }

  expect(shown(await readAuditLog(discord, { text: "répét" }))).toEqual([
    INSULTS,
  ])
})
