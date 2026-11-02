import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, onTestFinished, test, vi } from "vitest"

import { addBlockedWord } from "@/blocked-words/add-blocked-word"
import { changeActionOfBlockedWord } from "@/blocked-words/change-action-of-blocked-word"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { readAuditLog, type AuditLogPage } from "./read-audit-log"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const LYRA = { id: "1400000000000000003", username: "lyra" }

class FakeDiscordFailingLaterModify extends FakeDiscord {
  private modifiesBeforeFailure: number | null = null

  failModifyAfter(modifies: number) {
    this.modifiesBeforeFailure = modifies
  }

  override modifyAutoModerationRule(
    ...call: Parameters<FakeDiscord["modifyAutoModerationRule"]>
  ) {
    if (this.modifiesBeforeFailure === 0) {
      this.modifiesBeforeFailure = null
      return Promise.reject(
        new DiscordError({
          method: "PATCH",
          route: ROUTES.autoModerationRule,
          status: 503,
        })
      )
    }
    if (this.modifiesBeforeFailure !== null) {
      this.modifiesBeforeFailure--
    }
    return super.modifyAutoModerationRule(...call)
  }
}

function discordWithModerator() {
  return new FakeDiscordFailingLaterModify({
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
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

function form(word: string, action = "block") {
  const data = new FormData()
  data.set("word", word)
  data.set("action", action)
  return data
}

function changing(word: string, action: string) {
  const data = form(word, action)
  data.set("change", "action")
  return data
}

function descriptions(page: AuditLogPage) {
  return page.days.flatMap(({ changes }) =>
    changes.map((change) =>
      change.kind === "rule" ? change.description : change.kind
    )
  )
}

function fromBlockToDay(word: string) {
  return `« ${word} » passe de « Bloquer seulement » à « Exclusion 1 jour »`
}

function added(word: string, action = "Bloquer seulement") {
  return `Ajout de « ${word} », action « ${action} »`
}

test("a word that changes action shows once, as the change from one action to the other, whether the rule of its new action is created by the change or exists already", async () => {
  const discord = discordWithModerator()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("foo"))
  await addBlockedWord(discord, moderator, form("bar", "timeout-1d"))
  await changeActionOfBlockedWord(
    discord,
    moderator,
    changing("foo", "timeout-1d")
  )
  await changeActionOfBlockedWord(
    discord,
    moderator,
    changing("bar", "timeout-1h")
  )
  const expected = [
    "« bar » passe de « Exclusion 1 jour » à « Exclusion 1 heure »",
    fromBlockToDay("foo"),
    added("bar", "Exclusion 1 jour"),
    added("foo"),
  ]

  const everyType = await readAuditLog(discord, {})
  const blockedWords = await readAuditLog(discord, { type: "blocked-words" })

  expect(descriptions(everyType)).toEqual(expected)
  expect(descriptions(blockedWords)).toEqual(expected)
  expect(
    everyType.days.flatMap(({ changes }) =>
      changes.map((change) => ({
        memberName: change.memberName,
        madeInDiscord: change.kind === "rule" && change.madeInDiscord,
      }))
    )
  ).toEqual(Array(4).fill({ memberName: "aldis", madeInDiscord: false }))
})

test("a word that moves from an action to another and back, then again, shows one change each time", async () => {
  const discord = discordWithModerator()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("foo"))
  for (const action of ["timeout-1d", "block", "timeout-1d"]) {
    await changeActionOfBlockedWord(discord, moderator, changing("foo", action))
  }

  expect(descriptions(await readAuditLog(discord, {}))).toEqual([
    fromBlockToDay("foo"),
    "« foo » passe de « Exclusion 1 jour » à « Bloquer seulement »",
    fromBlockToDay("foo"),
    added("foo"),
  ])
})

test("a change cut after its first write shows as the word's addition to its new action, and the change that cleans it, long after, as the word's removal from the old one", async () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-10-28T14:00:00.000Z"))
  onTestFinished(() => {
    vi.useRealTimers()
  })
  const discord = discordWithModerator()
  const moderator = await moderatorOn(discord)
  await addBlockedWord(discord, moderator, form("foo"))
  await addBlockedWord(discord, moderator, form("bar", "timeout-1d"))
  discord.failModifyAfter(1)
  await changeActionOfBlockedWord(
    discord,
    moderator,
    changing("foo", "timeout-1d")
  )

  expect(descriptions(await readAuditLog(discord, {}))).toEqual([
    added("foo", "Exclusion 1 jour"),
    added("bar", "Exclusion 1 jour"),
    added("foo"),
  ])

  vi.setSystemTime(new Date("2026-10-28T15:00:00.000Z"))
  await changeActionOfBlockedWord(
    discord,
    moderator,
    changing("foo", "timeout-1d")
  )

  expect(descriptions(await readAuditLog(discord, {}))).toEqual([
    "Retrait de « foo », action « Bloquer seulement »",
    added("foo", "Exclusion 1 jour"),
    added("bar", "Exclusion 1 jour"),
    added("foo"),
  ])
})

for (const { rule, older } of [
  { rule: "that the change creates", older: [] },
  {
    rule: "that exists already",
    older: [added("cerise", "Exclusion 1 jour")],
  },
]) {
  test(`a change whose two entries sit on either side of the page's 50th line, the rule of its new action being one ${rule}, shows once, as the 50th, and the older page repeats nothing and skips nothing`, async () => {
    const discord = discordWithModerator()
    const moderator = await moderatorOn(discord)
    if (older.length > 0) {
      await addBlockedWord(discord, moderator, form("cerise", "timeout-1d"))
    }
    for (const word of ["vieux1", "vieux2", "vieux3", "foo"]) {
      await addBlockedWord(discord, moderator, form(word))
    }
    await changeActionOfBlockedWord(
      discord,
      moderator,
      changing("foo", "timeout-1d")
    )
    for (let index = 1; index <= 49; index++) {
      await addBlockedWord(discord, moderator, form(`mot${index}`))
    }

    const newest = await readAuditLog(discord, {})
    const olderPage = await readAuditLog(discord, { before: newest.older })

    expect(descriptions(newest)).toHaveLength(50)
    expect(descriptions(newest)[0]).toBe(added("mot49"))
    expect(descriptions(newest).at(-1)).toBe(fromBlockToDay("foo"))
    expect(descriptions(olderPage)).toEqual([
      added("foo"),
      added("vieux3"),
      added("vieux2"),
      added("vieux1"),
      ...older,
    ])
    expect(olderPage.older).toBeNull()
  })
}

test("changes of action, whose two entries count as one change, leave no gap in a page that shares Discord's entries with other AutoMod rules and with older timeouts", async () => {
  const discord = new FakeDiscordFailingLaterModify({
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
      { user: LYRA, roles: [] },
    ],
  })
  const moderator = await moderatorOn(discord)
  for (let index = 1; index <= 30; index++) {
    discord.modifyMemberAs(
      BRYN.id,
      LYRA.id,
      { communication_disabled_until: "2026-10-29T14:00:00.000Z" },
      `Motif ${index}`
    )
  }
  await addBlockedWord(discord, moderator, form("cerise", "timeout-1d"))
  const words = Array.from({ length: 31 }, (_, index) => `mot${index + 1}`)
  for (const word of words) {
    await addBlockedWord(discord, moderator, form(word))
  }
  for (const word of words.slice(0, 30)) {
    await changeActionOfBlockedWord(
      discord,
      moderator,
      changing(word, "timeout-1d")
    )
  }
  const noisy = discord.createAutoModerationRuleAs(BRYN.id, {
    name: "Liens",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["http"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })
  for (let index = 1; index <= 40; index++) {
    discord.modifyAutoModerationRuleAs(BRYN.id, noisy.id, {
      enabled: index % 2 === 0,
    })
  }

  const lines = descriptions(await readAuditLog(discord, {}))

  expect(lines).toEqual([
    ...words.slice(0, 30).toReversed().map(fromBlockToDay),
    ...words
      .toReversed()
      .map((word) => added(word))
      .slice(0, 20),
  ])
})

test("a page of 50 changes that all are changes of action shows each once, its cursor leads to the older changes, which no page repeats or skips, and an author filter finds the same", async () => {
  const discord = discordWithModerator()
  const moderator = await moderatorOn(discord)
  const words = Array.from({ length: 52 }, (_, index) => `mot${index}`)
  for (const word of words) {
    await addBlockedWord(discord, moderator, form(word))
  }
  for (const word of words) {
    await changeActionOfBlockedWord(
      discord,
      moderator,
      changing(word, "timeout-1d")
    )
  }
  const newestFirst = words.toReversed()
  const everyLine = [
    ...newestFirst.map(fromBlockToDay),
    ...newestFirst.map((word) => added(word)),
  ]

  const first = await readAuditLog(discord, {})
  const second = await readAuditLog(discord, { before: first.older })
  const third = await readAuditLog(discord, { before: second.older })

  expect(descriptions(first)).toEqual(everyLine.slice(0, 50))
  expect(descriptions(second)).toEqual(everyLine.slice(50, 100))
  expect(descriptions(third)).toEqual(everyLine.slice(100))
  expect(third.older).toBeNull()
  for (const filters of [
    { author: "ald" },
    { author: ALDIS.id },
    { author: "ald", type: "blocked-words" },
  ] as const) {
    const filteredFirst = await readAuditLog(discord, filters)
    const filteredSecond = await readAuditLog(discord, {
      ...filters,
      before: filteredFirst.older,
    })
    expect(descriptions(filteredFirst)).toEqual(descriptions(first))
    expect(descriptions(filteredSecond)).toEqual(descriptions(second))
  }
  expect(descriptions(await readAuditLog(discord, { author: "bry" }))).toEqual(
    []
  )
})
