import { expect, test } from "vitest"

import { readBlockedWords } from "@/blocked-words/read-blocked-words"
import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember } from "@/staff/staff-member"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test("the blocked words do not hold the link rule as one of the panel's rules: it reads there as one of the other AutoMod rules, by its name, with no keyword", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
  const staffMember = await findStaffMember(
    discord,
    { staffRoleId: STAFF_ROLE_ID, moderationRoleIds: [], banRoleIds: [] },
    ALDIS.id
  )
  if (staffMember === null) {
    throw new Error("aldis is no staff member")
  }
  const data = new FormData()
  data.set("enabled", "true")

  await switchLinkRule(discord, staffMember, data)

  const [rule] = await discord.listAutoModerationRules()
  expect(await readBlockedWords(discord)).toEqual({
    words: [],
    otherRules: [
      { id: rule?.id, name: "Liens bloqués du panel", keywords: [] },
    ],
  })
})
