import { expect, test } from "vitest"

import { FakeDiscord } from "@/discord/fake-discord"
import { findStaffMember, opensModerationOnceRead } from "./staff-member"

const STAFF_ROLE_ID = "1300000000000000000"

const OTHER_ROLE_ID = "1300000000000000001"

const MODERATION_ROLE_ID = "1300000000000000002"

const ROLES = {
  staffRoleId: STAFF_ROLE_ID,
  moderationRoleIds: ["1300000000000000004", MODERATION_ROLE_ID],
}

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test("a member holding the staff role is a staff member, under their Discord name, with their roles", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [OTHER_ROLE_ID, STAFF_ROLE_ID] }],
  })

  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toEqual({
    id: ALDIS.id,
    name: "aldis",
    avatarUrl: null,
    opensModeration: false,
    roleIds: [OTHER_ROLE_ID, STAFF_ROLE_ID],
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
    await findStaffMember(discord, ROLES, "1400000000000000002")
  ).toMatchObject({ name: "Brynja la Rouge" })
  expect(
    await findStaffMember(discord, ROLES, "1400000000000000003")
  ).toMatchObject({ name: "Corvus" })
})

test("a staff member's avatar is their avatar on the Discord server, else their Discord avatar, else none", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: {
          id: "1400000000000000002",
          username: "brynja",
          avatar: "6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c",
        },
        avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
        roles: [STAFF_ROLE_ID],
      },
      {
        user: {
          id: "1400000000000000003",
          username: "corvus",
          avatar: "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
        },
        roles: [STAFF_ROLE_ID],
      },
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
    ],
  })

  expect(
    await findStaffMember(discord, ROLES, "1400000000000000002")
  ).toMatchObject({
    avatarUrl:
      "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000002/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64",
  })
  expect(
    await findStaffMember(discord, ROLES, "1400000000000000003")
  ).toMatchObject({
    avatarUrl:
      "https://cdn.discordapp.com/avatars/1400000000000000003/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
  })
  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toMatchObject({
    avatarUrl: null,
  })
})

test("a staff member's animated avatar shows still, with no animated=true", async () => {
  const discord = new FakeDiscord({
    members: [
      {
        user: ALDIS,
        avatar: "a_9f8e7d6c5b4a39281706f5e4d3c2b1a0",
        roles: [STAFF_ROLE_ID],
      },
    ],
  })

  const staffMember = await findStaffMember(discord, ROLES, ALDIS.id)

  expect(staffMember?.avatarUrl).toBe(
    "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000001/avatars/a_9f8e7d6c5b4a39281706f5e4d3c2b1a0.webp?size=64"
  )
  expect(staffMember?.avatarUrl).not.toContain("animated")
})

test("a staff member holding a role of the moderation section's list opens it", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
  })

  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toMatchObject({
    opensModeration: true,
  })
})

test("a member holding a role of the moderation section's list, but not the staff role, is no staff member", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [MODERATION_ROLE_ID] }],
  })

  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toBeNull()
})

test("a member without the staff role is no staff member", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [OTHER_ROLE_ID] }],
  })

  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toBeNull()
})

test("a user who is not on the Discord server is no staff member", async () => {
  const discord = new FakeDiscord()

  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toBeNull()
})

test("a staff member who loses the staff role is no staff member at the next check", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
  expect(await findStaffMember(discord, ROLES, ALDIS.id)).not.toBeNull()

  discord.removeMemberRole(ALDIS.id, STAFF_ROLE_ID)

  expect(await findStaffMember(discord, ROLES, ALDIS.id)).toBeNull()
})

test("a staff member opens the moderation section once read, and none when the read fails", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
  })
  const staffMember = findStaffMember(discord, ROLES, ALDIS.id).then(
    (found) => found ?? Promise.reject(new Error("Aldis is no staff member"))
  )

  expect(await opensModerationOnceRead(staffMember)).toBe(true)
  expect(
    await opensModerationOnceRead(
      Promise.reject(new Error("Discord unavailable"))
    )
  ).toBe(false)
})
