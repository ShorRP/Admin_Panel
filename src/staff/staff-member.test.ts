import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember } from "./staff-member"

const STAFF_ROLE_ID = "1300000000000000000"

const OTHER_ROLE_ID = "1300000000000000001"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test("a member holding the staff role is a staff member, under their Discord name", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [OTHER_ROLE_ID, STAFF_ROLE_ID] }],
  })

  expect(await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)).toEqual({
    id: ALDIS.id,
    name: "aldis",
  })
})

test("a staff member's name is their nickname on the Discord server, else their display name, else their username", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: {
          id: "1400000000000000002",
          username: "brynja",
          global_name: "Brynja",
        },
        nick: "Brynja la Rouge",
        roles: [STAFF_ROLE_ID],
      },
      {
        user: {
          id: "1400000000000000003",
          username: "corvus",
          global_name: "Corvus",
        },
        roles: [STAFF_ROLE_ID],
      },
    ],
  })

  expect(
    await findStaffMember(discord, STAFF_ROLE_ID, "1400000000000000002")
  ).toMatchObject({ name: "Brynja la Rouge" })
  expect(
    await findStaffMember(discord, STAFF_ROLE_ID, "1400000000000000003")
  ).toMatchObject({ name: "Corvus" })
})

test("a member without the staff role is no staff member", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [OTHER_ROLE_ID] }],
  })

  expect(await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)).toBeNull()
})

test("a user who is not on the Discord server is no staff member", async () => {
  const discord = new FakeDiscord()

  expect(await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)).toBeNull()
})

test("a staff member who loses the staff role is no staff member at the next check", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
  expect(await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)).not.toBeNull()

  discord.removeMemberRole(ALDIS.id, STAFF_ROLE_ID)

  expect(await findStaffMember(discord, STAFF_ROLE_ID, ALDIS.id)).toBeNull()
})
