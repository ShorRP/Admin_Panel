import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, onTestFinished, test, vi } from "vitest"

import { addBlockedWord } from "@/blocked-words/add-blocked-word"
import { FakeDiscord } from "@/discord/fake-discord"
import { switchLinkRule } from "@/link-rule/switch-link-rule"
import { findStaffMember } from "@/staff/staff-member"
import { auditLogReason } from "./audit-log-reason"
import { readAuditLog, type AuditLogPage } from "./read-audit-log"

const STAFF_ROLE_ID = "1300000000000000000"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = {
  id: "1400000000000000002",
  username: "bryn",
  global_name: "Bryn la Rouge",
}

const NOW = new Date("2026-10-28T14:00:00.000Z")

function freezeTime() {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

function discordWithStaff() {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }, { user: BRYN }],
  })
}

async function aldisOn(discord: FakeDiscord) {
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

function switchForm(enabled: string) {
  const data = new FormData()
  data.set("enabled", enabled)
  return data
}

function changesOf({ days }: AuditLogPage) {
  return days.flatMap(({ changes }) => changes)
}

function shown(page: AuditLogPage) {
  return changesOf(page).map((change) => ({
    memberName: change.memberName,
    description: change.kind === "rule" ? change.description : null,
  }))
}

test("the link rule created, cut and switched back on through the panel, then changed in Discord, shows one line for each write, newest first, under « Tout », with the panel's reason or « Règle modifiée dans Discord »", async () => {
  const discord = discordWithStaff()
  const aldis = await aldisOn(discord)
  await switchLinkRule(discord, aldis, switchForm("true"))
  await switchLinkRule(discord, aldis, switchForm("false"))
  await switchLinkRule(discord, aldis, switchForm("true"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, rule?.id ?? "", {
    enabled: false,
  })

  const page = await readAuditLog(discord, {})

  expect(shown(page)).toEqual([
    { memberName: "Bryn la Rouge", description: "Règle modifiée dans Discord" },
    { memberName: "aldis", description: "Activation de la règle des liens" },
    { memberName: "aldis", description: "Coupure de la règle des liens" },
    {
      memberName: "aldis",
      description: "Création et activation de la règle des liens",
    },
  ])
})

test("a reason that is none of a switch's shows as it is, with its first letter in capitals, and a rule that does not carry exactly the link rule's name never shows", async () => {
  const discord = discordWithStaff()
  const aldis = await aldisOn(discord)
  for (const name of [
    "Liens bloqués du panel (ancienne)",
    "liens bloqués du panel",
    "Liens bloqués du panel ",
  ]) {
    const handMade = discord.createAutoModerationRuleAs(ALDIS.id, {
      name,
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: { keyword_filter: ["http"] },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
    })
    discord.modifyAutoModerationRuleAs(BRYN.id, handMade.id, { enabled: false })
  }
  expect(shown(await readAuditLog(discord, {}))).toEqual([])
  await switchLinkRule(discord, aldis, switchForm("true"))
  const rule = (await discord.listAutoModerationRules()).find(
    ({ name }) => name === "Liens bloqués du panel"
  )
  await discord.modifyAutoModerationRule(
    rule?.id ?? "",
    { enabled: false },
    auditLogReason(aldis, "réglage que le journal ne connaît pas")
  )

  const expected = [
    {
      memberName: "aldis",
      description: "Réglage que le journal ne connaît pas",
    },
    {
      memberName: "aldis",
      description: "Création et activation de la règle des liens",
    },
  ]
  expect(shown(await readAuditLog(discord, {}))).toEqual(expected)
  expect(shown(await readAuditLog(discord, { type: "links" }))).toEqual(
    expected
  )
})

test("the author, the text and the period apply to the link rule's lines as to the others, and an account chosen leaves them out", async () => {
  freezeTime()
  const discord = discordWithStaff()
  const aldis = await aldisOn(discord)
  await switchLinkRule(discord, aldis, switchForm("true"))
  await switchLinkRule(discord, aldis, switchForm("false"))
  const [rule] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, rule?.id ?? "", { enabled: true })
  const byBryn = {
    memberName: "Bryn la Rouge",
    description: "Règle modifiée dans Discord",
  }
  const cut = {
    memberName: "aldis",
    description: "Coupure de la règle des liens",
  }
  const created = {
    memberName: "aldis",
    description: "Création et activation de la règle des liens",
  }
  const links = async (filters: Parameters<typeof readAuditLog>[1]) =>
    shown(await readAuditLog(discord, { type: "links", ...filters }))

  expect(await links({ author: "bryn" })).toEqual([byBryn])
  expect(await links({ author: "ALD" })).toEqual([cut, created])
  expect(await links({ text: "coupure" })).toEqual([cut])
  expect(await links({ text: "règle des" })).toEqual([cut, created])
  expect(await links({ from: "2026-10-28", to: "2026-10-28" })).toEqual([
    byBryn,
    cut,
    created,
  ])
  expect(await links({ from: "2026-10-20", to: "2026-10-20" })).toEqual([])
  expect(await links({ account: "lyra" })).toEqual([])
  expect(await links({ account: ALDIS.id })).toEqual([])
})

function wordForm(word: string) {
  const data = new FormData()
  data.set("word", word)
  data.set("action", "block")
  return data
}

test("« Liens » keeps the link rule's lines alone and « Mots interdits » none of them, while « Tout » holds both", async () => {
  const discord = discordWithStaff()
  const aldis = await aldisOn(discord)
  await addBlockedWord(discord, aldis, wordForm("foo"))
  await switchLinkRule(discord, aldis, switchForm("true"))
  const linkLine = {
    memberName: "aldis",
    description: "Création et activation de la règle des liens",
  }
  const wordLine = {
    memberName: "aldis",
    description: "Ajout de « foo », action « Bloquer seulement »",
  }

  expect(shown(await readAuditLog(discord, {}))).toEqual([linkLine, wordLine])
  expect(
    changesOf(await readAuditLog(discord, {})).map(
      (change) => change.kind === "rule" && change.rule
    )
  ).toEqual(["links", "blocked-words"])
  expect(shown(await readAuditLog(discord, { type: "links" }))).toEqual([
    linkLine,
  ])
  expect(shown(await readAuditLog(discord, { type: "blocked-words" }))).toEqual(
    [wordLine]
  )
  for (const type of ["timeouts", "kicks", "bans"]) {
    expect(shown(await readAuditLog(discord, { type }))).toEqual([])
  }
})
