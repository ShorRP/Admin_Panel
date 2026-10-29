import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { newPanelRule } from "./panel-rule"
import { readBlockedWordCount } from "./read-blocked-word-count"

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

test("the count is the number of keywords of the panel's rule, whatever another AutoMod rule holds", async () => {
  const discord = discordWithStaff()
  discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Liens",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["www", "http"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  })
  await discord.createAutoModerationRule(
    newPanelRule(["foo", "bar", "baz"]),
    "Created by the panel"
  )

  expect(await readBlockedWordCount(discord, staffMemberOn(discord))).toBe(3)
})

test("before the panel's rule exists the count is 0, and reading creates no rule", async () => {
  const discord = discordWithStaff()

  expect(await readBlockedWordCount(discord, staffMemberOn(discord))).toBe(0)
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a DiscordError while reading the rules gives no count", async () => {
  const discord = discordWithStaff()
  await discord.createAutoModerationRule(
    newPanelRule(["foo"]),
    "Created by the panel"
  )
  const staffMember = staffMemberOn(discord)
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({
      method: "GET",
      route: ROUTES.autoModerationRules,
      status: 503,
    })
  )

  expect(await readBlockedWordCount(discord, staffMember)).toBeNull()
})

const BUG = new TypeError("Cannot read properties of undefined")

class FakeDiscordWithBuggyRules extends FakeDiscord {
  override listAutoModerationRules(): Promise<never> {
    return Promise.reject(BUG)
  }
}

test("reading the rules failing with anything but a DiscordError is thrown", async () => {
  const discord = new FakeDiscordWithBuggyRules({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })

  await expect(
    readBlockedWordCount(discord, staffMemberOn(discord))
  ).rejects.toBe(BUG)
})

test("a staff check that fails gives no count, without reading the rules", async () => {
  const discord = new FakeDiscordWithBuggyRules({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })

  expect(
    await readBlockedWordCount(
      discord,
      Promise.reject(new Error("NEXT_REDIRECT"))
    )
  ).toBeNull()
})
