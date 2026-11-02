import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember } from "@/staff/staff-member"
import { addBlockedWord } from "./add-blocked-word"
import { changeBlockedWord } from "./change-blocked-word"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const BRYN = { id: "1400000000000000002", username: "bryn" }

async function moderatorOn(discord: FakeDiscord) {
  const staffMember = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF_ROLE_ID,
      moderationRoleIds: [MODERATION_ROLE_ID],
      banRoleIds: [],
    },
    BRYN.id
  )
  if (staffMember === null) {
    throw new Error("Bryn is no staff member")
  }
  return staffMember
}

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value)
  }
  return data
}

async function discordWithFoo() {
  const discord = new FakeDiscord({
    members: [{ user: BRYN, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
  })
  const moderator = await moderatorOn(discord)
  await addBlockedWord(
    discord,
    moderator,
    form({ word: "foo", action: "block" })
  )
  return { discord, moderator }
}

async function keywordsByRule(discord: FakeDiscord) {
  return (await discord.listAutoModerationRules()).map(
    (rule) => rule.trigger_metadata.keyword_filter
  )
}

test("a form whose change is « action » gives the word another action", async () => {
  const { discord, moderator } = await discordWithFoo()

  const result = await changeBlockedWord(
    discord,
    moderator,
    form({ change: "action", word: "foo", action: "timeout-1h" })
  )

  expect(result).toEqual({
    ok: true,
    message: "« foo » passe à « Exclusion 1 heure ».",
  })
  expect(await keywordsByRule(discord)).toEqual([[], ["foo"]])
})

test("a form whose change is « remove », or none, removes the word", async () => {
  const variants: Record<string, string>[] = [
    { change: "remove", word: "foo" },
    { word: "foo" },
  ]
  for (const fields of variants) {
    const { discord, moderator } = await discordWithFoo()

    const result = await changeBlockedWord(discord, moderator, form(fields))

    expect(result.ok).toBe(true)
    expect(await keywordsByRule(discord)).toEqual([[]])
  }
})
