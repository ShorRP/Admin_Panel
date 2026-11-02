import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember } from "@/staff/staff-member"
import { ownRecordOnceRead } from "./own-record"

const STAFF_ROLE_ID = "1300000000000000000"

const MODERATION_ROLE_ID = "1300000000000000002"

const ROLES = {
  staffRoleId: STAFF_ROLE_ID,
  moderationRoleIds: [MODERATION_ROLE_ID],
  banRoleIds: [],
}

const ALDIS = { id: "1400000000000000001", username: "aldis" }

function staffMemberOn(discord: FakeDiscord) {
  return findStaffMember(discord, ROLES, ALDIS.id).then(
    (found) => found ?? Promise.reject(new Error("Aldis is no staff member"))
  )
}

test("a staff member who moderates opens their own record once read, under their name, and none when the read fails", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
  })

  expect(await ownRecordOnceRead(staffMemberOn(discord))).toEqual({
    href: `/records/${ALDIS.id}`,
    name: "aldis",
  })
  expect(
    await ownRecordOnceRead(Promise.reject(new Error("Discord unavailable")))
  ).toBeNull()
})

test("a staff member who does not moderate opens no record of their own", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })

  expect(await ownRecordOnceRead(staffMemberOn(discord))).toBeNull()
})
