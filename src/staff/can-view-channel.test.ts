import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { FakeDiscord, type FakeChannel } from "@/discord/fake-discord"
import { canViewChannel, viewsChannel } from "./can-view-channel"
import { findStaffMember } from "./staff-member"

const GUILD_ID = new FakeDiscord().guildId

const STAFF_ROLE_ID = "1300000000000000000"

const SUPPORT_ROLE_ID = "1300000000000000001"

const OTHER_ROLE_ID = "1300000000000000002"

const ADMINISTRATOR_ROLE_ID = "1300000000000000003"

const ROLES = {
  staffRoleId: STAFF_ROLE_ID,
  moderationRoleIds: [],
  banRoleIds: [],
}

const OWNER = { id: "1400000000000000000", username: "owner" }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const CORVUS = { id: "1400000000000000003", username: "corvus" }

const VIEW = String(PermissionFlagsBits.ViewChannel)

const EVERYONE_VIEWS = {
  id: GUILD_ID,
  name: "@everyone",
  permissions: VIEW,
}

const CATEGORY_ID = "1500000000000000000"

const CHANNEL_ID = "1500000000000000001"

function allows(id: string, type = OverwriteType.Role) {
  return { id, type, allow: VIEW, deny: "0" }
}

function denies(id: string, type = OverwriteType.Role) {
  return { id, type, allow: "0", deny: VIEW }
}

function category(
  permission_overwrites: FakeChannel["permission_overwrites"]
): FakeChannel {
  return {
    id: CATEGORY_ID,
    type: ChannelType.GuildCategory,
    name: "・TICKETS PRIVÉS ・",
    permission_overwrites,
  }
}

function channel(
  permission_overwrites: FakeChannel["permission_overwrites"],
  parent_id: string | null = null
): FakeChannel {
  return { id: CHANNEL_ID, name: "🛠・aldis", parent_id, permission_overwrites }
}

function serverWith(
  channels: FakeChannel[],
  {
    everyone = VIEW,
    staff = "0",
    support = "0",
  }: { everyone?: string; staff?: string; support?: string } = {}
) {
  return new FakeDiscord({
    ownerId: OWNER.id,
    roles: [
      { ...EVERYONE_VIEWS, permissions: everyone },
      { id: STAFF_ROLE_ID, name: "Staff", permissions: staff },
      { id: SUPPORT_ROLE_ID, name: "Support", permissions: support },
      { id: OTHER_ROLE_ID, name: "Autre" },
      {
        id: ADMINISTRATOR_ROLE_ID,
        name: "Administrateur",
        permissions: String(PermissionFlagsBits.Administrator),
      },
    ],
    members: [
      { user: OWNER, roles: [STAFF_ROLE_ID] },
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID, SUPPORT_ROLE_ID] },
      { user: CORVUS, roles: [STAFF_ROLE_ID, ADMINISTRATOR_ROLE_ID] },
    ],
    channels,
  })
}

async function seen(
  discord: FakeDiscord,
  user: { id: string },
  channelId: string = CHANNEL_ID
) {
  const staffMember = await findStaffMember(discord, ROLES, user.id)
  if (staffMember === null) {
    throw new Error("Expected a staff member")
  }
  return await canViewChannel(discord, staffMember, channelId)
}

test("a staff member views a channel that no overwrite touches when the Discord server's @everyone can view channels", async () => {
  const discord = serverWith([channel([])])

  expect(await seen(discord, ALDIS)).toBe(true)
})

test("a staff member views no channel that no overwrite touches when neither @everyone nor any role of theirs can view channels", async () => {
  const discord = serverWith([channel([])], { everyone: "0" })

  expect(await seen(discord, ALDIS)).toBe(false)
})

test("a role that can view channels shows a channel that @everyone cannot to the staff members who hold it", async () => {
  const discord = serverWith([channel([])], {
    everyone: "0",
    support: VIEW,
  })

  expect(await seen(discord, BRYNJA)).toBe(true)
  expect(await seen(discord, ALDIS)).toBe(false)
})

test("a channel that denies View Channel to @everyone is hidden from a staff member whom no overwrite allows", async () => {
  const discord = serverWith([channel([denies(GUILD_ID)])])

  expect(await seen(discord, ALDIS)).toBe(false)
})

test("a channel that denies @everyone and allows a role is viewed by the staff members who hold the role and by none else", async () => {
  const discord = serverWith([
    channel([denies(GUILD_ID), allows(SUPPORT_ROLE_ID)]),
  ])

  expect(await seen(discord, BRYNJA)).toBe(true)
  expect(await seen(discord, ALDIS)).toBe(false)
})

test("a deny on the category hides the channels synced to it, which hold its overwrites, from the staff members it does not allow, and the category too", async () => {
  const overwrites = [denies(GUILD_ID), allows(SUPPORT_ROLE_ID)]
  const discord = serverWith([
    category(overwrites),
    channel(overwrites, CATEGORY_ID),
  ])

  expect(await seen(discord, ALDIS)).toBe(false)
  expect(await seen(discord, BRYNJA)).toBe(true)
  expect(await seen(discord, ALDIS, CATEGORY_ID)).toBe(false)
  expect(await seen(discord, BRYNJA, CATEGORY_ID)).toBe(true)
})

test("a channel that allows a role the category denies is viewed by that role, since only the channel's own overwrites count", async () => {
  const discord = serverWith([
    category([denies(GUILD_ID), denies(SUPPORT_ROLE_ID)]),
    channel([denies(GUILD_ID), allows(SUPPORT_ROLE_ID)], CATEGORY_ID),
  ])

  expect(await seen(discord, BRYNJA)).toBe(true)
  expect(await seen(discord, ALDIS)).toBe(false)
})

test("a channel that holds no overwrite is viewed under a category that denies View Channel to @everyone, which it is no longer synced to", async () => {
  const discord = serverWith([
    category([denies(GUILD_ID)]),
    channel([], CATEGORY_ID),
  ])

  expect(await seen(discord, ALDIS)).toBe(true)
  expect(await seen(discord, ALDIS, CATEGORY_ID)).toBe(false)
})

test("a channel that denies @everyone stays hidden under a category that allows it", async () => {
  const discord = serverWith([
    category([allows(GUILD_ID), allows(SUPPORT_ROLE_ID)]),
    channel([denies(GUILD_ID)], CATEGORY_ID),
  ])

  expect(await seen(discord, BRYNJA)).toBe(false)
  expect(await seen(discord, ALDIS, CATEGORY_ID)).toBe(true)
})

test("a role that the staff member holds and the channel denies hides it, though @everyone is allowed", async () => {
  const discord = serverWith([
    channel([allows(GUILD_ID), denies(SUPPORT_ROLE_ID)]),
  ])

  expect(await seen(discord, BRYNJA)).toBe(false)
  expect(await seen(discord, ALDIS)).toBe(true)
})

test("an overwrite for a role the staff member does not hold counts for nothing", async () => {
  const denied = serverWith([
    channel([denies(OTHER_ROLE_ID), denies(SUPPORT_ROLE_ID)]),
  ])
  const allowed = serverWith([
    channel([denies(GUILD_ID), allows(OTHER_ROLE_ID)]),
  ])

  expect(await seen(denied, ALDIS)).toBe(true)
  expect(await seen(allowed, ALDIS)).toBe(false)
})

test("of two roles the staff member holds, the one that allows wins over the one that denies", async () => {
  const discord = serverWith([
    channel([denies(GUILD_ID), denies(STAFF_ROLE_ID), allows(SUPPORT_ROLE_ID)]),
  ])

  expect(await seen(discord, BRYNJA)).toBe(true)
  expect(await seen(discord, ALDIS)).toBe(false)
})

test("an overwrite of the staff member's own shows a channel their roles and @everyone deny, and nobody else's", async () => {
  const discord = serverWith([
    channel([
      denies(GUILD_ID),
      denies(SUPPORT_ROLE_ID),
      allows(BRYNJA.id, OverwriteType.Member),
    ]),
  ])

  expect(await seen(discord, BRYNJA)).toBe(true)
  expect(await seen(discord, ALDIS)).toBe(false)
})

test("an overwrite of the staff member's own hides a channel their roles allow", async () => {
  const discord = serverWith([
    channel([
      denies(GUILD_ID),
      allows(SUPPORT_ROLE_ID),
      denies(BRYNJA.id, OverwriteType.Member),
    ]),
  ])

  expect(await seen(discord, BRYNJA)).toBe(false)
})

test("a member with the Administrator permission views every channel, whatever its overwrites say", async () => {
  const discord = serverWith([
    channel([
      denies(GUILD_ID),
      denies(ADMINISTRATOR_ROLE_ID),
      denies(CORVUS.id, OverwriteType.Member),
    ]),
  ])

  expect(await seen(discord, CORVUS)).toBe(true)
  expect(await seen(discord, ALDIS)).toBe(false)
})

test("the owner of the Discord server views every channel, whatever its overwrites say", async () => {
  const discord = serverWith([
    channel([
      denies(GUILD_ID),
      denies(STAFF_ROLE_ID),
      denies(OWNER.id, OverwriteType.Member),
    ]),
  ])

  expect(await seen(discord, OWNER)).toBe(true)
})

test("a channel that the Discord server does not list is not viewed, by anyone", async () => {
  const discord = serverWith([channel([])])

  expect(await seen(discord, ALDIS, "1500000000000000999")).toBe(false)
  expect(await seen(discord, CORVUS, "1500000000000000999")).toBe(false)
  expect(await seen(discord, OWNER, "1500000000000000999")).toBe(false)
})

test("a timed-out staff member views what they viewed before, since a timeout leaves View Channel", async () => {
  const discord = new FakeDiscord({
    roles: [EVERYONE_VIEWS, { id: STAFF_ROLE_ID, name: "Staff" }],
    members: [
      {
        user: ALDIS,
        roles: [STAFF_ROLE_ID],
        communication_disabled_until: "2999-01-01T00:00:00.000000+00:00",
      },
    ],
    channels: [channel([])],
  })

  expect(await seen(discord, ALDIS)).toBe(true)
})

test("the staff member's roles are the ones the staff check read, not the ones the Discord server holds later", async () => {
  const discord = serverWith([
    channel([denies(GUILD_ID), allows(SUPPORT_ROLE_ID)]),
  ])
  const staffMember = await findStaffMember(discord, ROLES, BRYNJA.id)
  if (staffMember === null) {
    throw new Error("Expected a staff member")
  }
  discord.removeMemberRole(BRYNJA.id, SUPPORT_ROLE_ID)

  expect(await canViewChannel(discord, staffMember, CHANNEL_ID)).toBe(true)
})

test("the channels of a list read once are answered one by one, as canViewChannel answers each", async () => {
  const other = { ...channel([denies(GUILD_ID)]), id: "1500000000000000002" }
  const discord = serverWith([channel([]), other, category([])])
  const staffMember = await findStaffMember(discord, ROLES, ALDIS.id)
  if (staffMember === null) {
    throw new Error("Expected a staff member")
  }

  const guild = await discord.getGuild()
  const channels = await discord.listChannels()

  expect(
    channels
      .filter((listed) => viewsChannel(guild, listed, staffMember))
      .map(({ id }) => id)
  ).toEqual([CHANNEL_ID, CATEGORY_ID])
  expect(await canViewChannel(discord, staffMember, other.id)).toBe(false)
})
