import {
  OverwriteType,
  PermissionFlagsBits,
  type APIUser,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { viewsGameLogOnceRead } from "./views-game-log-once-read"

const GUILD_ID = new FakeDiscord().guildId

const STAFF_ROLE_ID = "1300000000000000000"

const GAME_LOG_ROLE_ID = "1300000000000000001"

const CHANNEL_ID = "1568022814483685377"

const CONFIG = { channelId: CHANNEL_ID, webhookId: "1568023050346307647" }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const VIEW = String(PermissionFlagsBits.ViewChannel)

function serverWithMembers() {
  return new FakeDiscord({
    roles: [
      { id: GUILD_ID, name: "@everyone", permissions: "0" },
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: GAME_LOG_ROLE_ID, name: "Développeurs" },
    ],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, GAME_LOG_ROLE_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
    ],
    channels: [
      {
        id: CHANNEL_ID,
        permission_overwrites: [
          { id: GUILD_ID, type: OverwriteType.Role, allow: "0", deny: VIEW },
          {
            id: GAME_LOG_ROLE_ID,
            type: OverwriteType.Role,
            allow: VIEW,
            deny: "0",
          },
        ],
      },
    ],
  })
}

async function staffMemberOn(
  discord: FakeDiscord,
  user: APIUser | typeof ALDIS
) {
  const staffMember = await findStaffMember(
    discord,
    { staffRoleId: STAFF_ROLE_ID, moderationRoleIds: [], banRoleIds: [] },
    user.id
  )
  if (staffMember === null) {
    throw new Error(`${user.username} is no staff member`)
  }
  return staffMember
}

test("a staff member who views the channel on Discord views the game log", async () => {
  const discord = serverWithMembers()

  expect(
    await viewsGameLogOnceRead(discord, CONFIG, staffMemberOn(discord, ALDIS))
  ).toBe(true)
})

test("a staff member who does not view the channel on Discord does not view the game log", async () => {
  const discord = serverWithMembers()

  expect(
    await viewsGameLogOnceRead(discord, CONFIG, staffMemberOn(discord, BRYNJA))
  ).toBe(false)
})

test("nobody views a game log that is not configured, and Discord is not asked", async () => {
  const discord = serverWithMembers()
  const staffMember = await staffMemberOn(discord, ALDIS)
  discord.failNext(
    "listChannels",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildChannels,
      status: 503,
    })
  )

  expect(
    await viewsGameLogOnceRead(discord, null, Promise.resolve(staffMember))
  ).toBe(false)
  await expect(discord.listChannels()).rejects.toBeInstanceOf(DiscordError)
})

test("a staff check that failed gives no link", async () => {
  const discord = serverWithMembers()

  expect(
    await viewsGameLogOnceRead(
      discord,
      CONFIG,
      Promise.reject(new Error("redirect"))
    )
  ).toBe(false)
})

test("Discord unavailable while the channel is read gives no link rather than an error", async () => {
  const discord = serverWithMembers()
  const staffMember = await staffMemberOn(discord, ALDIS)
  discord.failNext(
    "listChannels",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildChannels,
      status: 503,
    })
  )

  expect(
    await viewsGameLogOnceRead(discord, CONFIG, Promise.resolve(staffMember))
  ).toBe(false)
})

test("anything but a Discord error is thrown, so that a panel error is not hidden", async () => {
  class Broken extends FakeDiscord {
    override listChannels(): never {
      throw new Error("bug")
    }
  }
  const discord = new Broken({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })
  const staffMember = await staffMemberOn(discord, ALDIS)

  await expect(
    viewsGameLogOnceRead(discord, CONFIG, Promise.resolve(staffMember))
  ).rejects.toThrow("bug")
})
