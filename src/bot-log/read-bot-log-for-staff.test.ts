import { OverwriteType, PermissionFlagsBits } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES, type DiscordRoute } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { botLogChannel, botLogMessage } from "./bot-log-message"
import { readBotLogForStaff } from "./read-bot-log-for-staff"

const GUILD_ID = new FakeDiscord().guildId

const STAFF_ROLE_ID = "1300000000000000000"

const DEVELOPERS_ROLE_ID = "1300000000000000001"

const CHANNEL_ID = "1568022878765719651"

const TICKET_CHANNEL_ID = "1400000000000000020"

const CONFIG = { channelId: CHANNEL_ID }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

function serverWithLine({ ticketViewedByStaff = true } = {}) {
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
      botLogChannel({ id: CHANNEL_ID, viewerRoleIds: [DEVELOPERS_ROLE_ID] }),
      {
        id: TICKET_CHANNEL_ID,
        name: "🎫・ticket-0042",
        permission_overwrites: ticketViewedByStaff
          ? [
              {
                id: STAFF_ROLE_ID,
                type: OverwriteType.Role,
                allow: String(PermissionFlagsBits.ViewChannel),
                deny: "0",
              },
            ]
          : [],
      },
    ],
    channelMessages: [
      botLogMessage({
        example: "tickets-ticket-opened",
        channelId: CHANNEL_ID,
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

test("a staff member who views the channel reads the Bot log", async () => {
  const discord = serverWithLine()

  const read = await readBotLogForStaff(
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

  expect(await readBotLogForStaff(discord, staffMember, CONFIG, {})).toEqual({
    kind: "hidden",
  })
  await expect(
    discord.searchMessages({ channel_id: [CHANNEL_ID] })
  ).rejects.toBeInstanceOf(DiscordError)
})

test("a Bot log left out of the configuration says so to any staff member, and Discord is not asked", async () => {
  const discord = serverWithLine()
  const staffMember = await staffMemberOn(discord, BRYNJA)
  discord.failNext("listChannels", unavailable(ROUTES.guildChannels))

  expect(await readBotLogForStaff(discord, staffMember, null, {})).toEqual({
    kind: "unconfigured",
  })
  await expect(discord.listChannels()).rejects.toBeInstanceOf(DiscordError)
})

test("a channel that Discord does not list reads as one nobody views", async () => {
  const discord = new FakeDiscord({
    roles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
  })

  expect(
    await readBotLogForStaff(
      discord,
      await staffMemberOn(discord, ALDIS),
      CONFIG,
      {}
    )
  ).toEqual({ kind: "hidden" })
})

test("the filters of the address reach the read", async () => {
  const discord = serverWithLine()

  const read = await readBotLogForStaff(
    discord,
    await staffMemberOn(discord, ALDIS),
    CONFIG,
    { family: "rules", text: "introuvable" }
  )

  expect(read).toMatchObject({
    kind: "page",
    family: "rules",
    text: "introuvable",
    days: [],
  })
})

test("a staff member reads the names of the channels they view, and not the others'", async () => {
  const open = serverWithLine()
  const gated = serverWithLine({ ticketViewedByStaff: false })

  const viewed = await readBotLogForStaff(
    open,
    await staffMemberOn(open, ALDIS),
    CONFIG,
    {}
  )
  const unviewed = await readBotLogForStaff(
    gated,
    await staffMemberOn(gated, ALDIS),
    CONFIG,
    {}
  )

  const salonOf = (read: typeof viewed) =>
    read.kind === "page"
      ? read.days
          .flatMap(({ entries }) => entries)
          .flatMap((entry) => (entry.kind === "event" ? entry.fields : []))
          .find(({ name }) => name === "Salon")?.parts
      : undefined
  expect(salonOf(viewed)).toEqual([
    { kind: "channel", id: TICKET_CHANNEL_ID, name: "🎫・ticket-0042" },
  ])
  expect(salonOf(unviewed)).toEqual([
    { kind: "channel", id: TICKET_CHANNEL_ID, name: null },
  ])
})
