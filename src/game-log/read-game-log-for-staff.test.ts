import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES, type DiscordRoute } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { gameLogChannel, gameLogMessage } from "./game-log-message"
import { readGameLogForStaff } from "./read-game-log-for-staff"

const GUILD_ID = new FakeDiscord().guildId

const STAFF_ROLE_ID = "1300000000000000000"

const DEVELOPERS_ROLE_ID = "1300000000000000001"

const CHANNEL_ID = "1568022814483685377"

const WEBHOOK_ID = "1568023050346307647"

const CONFIG = { channelId: CHANNEL_ID, webhookId: WEBHOOK_ID }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

function serverWithLine() {
  return new FakeDiscord({
    roles: [
      { id: GUILD_ID, name: "@everyone", permissions: "0" },
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: DEVELOPERS_ROLE_ID, name: "Développeurs" },
    ],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, DEVELOPERS_ROLE_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
    ],
    channels: [
      gameLogChannel({ id: CHANNEL_ID, viewerRoleIds: [DEVELOPERS_ROLE_ID] }),
    ],
    channelMessages: [
      gameLogMessage({
        channelId: CHANNEL_ID,
        webhookId: WEBHOOK_ID,
        sentAt: new Date("2026-11-04T09:12:00Z"),
      }),
    ],
  })
}

async function staffMemberOn(discord: FakeDiscord, user: typeof ALDIS) {
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

function unavailable(route: DiscordRoute) {
  return new DiscordError({ method: "GET", route, status: 503 })
}

test("a staff member who views the channel reads the game log", async () => {
  const discord = serverWithLine()

  const read = await readGameLogForStaff(
    discord,
    await staffMemberOn(discord, ALDIS),
    CONFIG,
    {}
  )

  expect(read.kind).toBe("page")
  expect(read.kind === "page" && read.days).toHaveLength(1)
})

test("a staff member who does not view the channel reads nothing, and the search is not made", async () => {
  const discord = serverWithLine()
  const staffMember = await staffMemberOn(discord, BRYNJA)
  discord.failNext("searchMessages", unavailable(ROUTES.guildMessagesSearch))

  expect(await readGameLogForStaff(discord, staffMember, CONFIG, {})).toEqual({
    kind: "hidden",
  })
  await expect(
    discord.searchMessages({ channel_id: [CHANNEL_ID] })
  ).rejects.toBeInstanceOf(DiscordError)
})

test("a game log left out of the configuration says so to any staff member, and Discord is not asked", async () => {
  const discord = serverWithLine()
  const staffMember = await staffMemberOn(discord, BRYNJA)
  discord.failNext("listChannels", unavailable(ROUTES.guildChannels))

  expect(await readGameLogForStaff(discord, staffMember, null, {})).toEqual({
    kind: "unconfigured",
  })
  await expect(discord.listChannels()).rejects.toBeInstanceOf(DiscordError)
})

test("the filters of the address reach the read", async () => {
  const discord = serverWithLine()

  const read = await readGameLogForStaff(
    discord,
    await staffMemberOn(discord, ALDIS),
    CONFIG,
    { text: "introuvable" }
  )

  expect(read).toMatchObject({ kind: "page", text: "introuvable", days: [] })
})
