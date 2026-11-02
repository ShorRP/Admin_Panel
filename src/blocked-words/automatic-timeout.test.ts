import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { readRecord } from "@/records/read-record"
import { readSanctionHistory } from "@/sanctions/read-sanction-history"
import { findStaffMember } from "@/staff/staff-member"
import { addBlockedWord } from "./add-blocked-word"

const NOW = new Date("2026-11-02T14:00:00.000Z")

const STAFF = { id: "1300000000000000000", name: "Staff", position: 6 }

const MODERATION = {
  id: "1300000000000000002",
  name: "Modération",
  position: 5,
}

const PANEL = { id: "1300000000000000021", name: "Shor Panel", position: 3 }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const LYRA = { id: "1400000000000000003", username: "lyra" }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

test("a member who writes a word tied to « Exclusion 1 heure » is timed out by AutoMod for an hour, and the account's history shows the timeout as AutoMod's, under the name of the word's rule", async () => {
  const discord = new FakeDiscord({
    roles: [STAFF, MODERATION, PANEL, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: BRYN, roles: [STAFF.id, MODERATION.id] },
      { user: LYRA, roles: [GUARD.id] },
    ],
  })
  const moderator = await findStaffMember(
    discord,
    {
      staffRoleId: STAFF.id,
      moderationRoleIds: [MODERATION.id],
      banRoleIds: [],
    },
    BRYN.id
  )
  if (moderator === null) {
    throw new Error("Bryn is no staff member")
  }
  const data = new FormData()
  data.set("word", "foo")
  data.set("action", "timeout-1h")
  await addBlockedWord(discord, moderator, data)
  const [rule] = await discord.listAutoModerationRules()

  discord.timeOutByAutoModeration(rule?.id ?? "", LYRA.id)

  expect((await discord.getMember(LYRA.id))?.communication_disabled_until).toBe(
    "2026-11-02T15:00:00.000Z"
  )
  expect(
    await readSanctionHistory(discord, await readRecord(discord, LYRA.id))
  ).toEqual([
    {
      id: expect.any(String),
      date: NOW,
      change: { kind: "timeout", end: null },
      author: {
        kind: "auto-moderation",
        ruleName: "Mots interdits du panel · exclusion 1 heure",
      },
      reason: null,
    },
  ])
})
