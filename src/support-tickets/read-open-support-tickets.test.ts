import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import {
  FakeDiscord,
  type FakeChannelMessage,
  type FakeDiscordState,
} from "@/discord/fake-discord"
import { findStaffMember } from "@/staff/staff-member"
import {
  readOpenSupportTickets,
  type OpenSupportTicket,
} from "./read-open-support-tickets"
import { channelIdAt, supportTicketChannel } from "./support-ticket-channel"

const CATEGORY_ID = "1500000000000000000"

const OTHER_CATEGORY_ID = "1500000000000000009"

const TICKET_ID = channelIdAt("2026-11-02T10:00:00Z")

const STAFF_ROLE_ID = "1300000000000000000"

const SUPPORT_ROLE_ID = "1300000000000000001"

const ROLES = {
  staffRoleId: STAFF_ROLE_ID,
  moderationRoleIds: [],
  banRoleIds: [],
}

const STAFF = { id: STAFF_ROLE_ID, name: "Staff", position: 5 }

const SUPPORT = { id: SUPPORT_ROLE_ID, name: "Support", position: 4 }

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = {
  id: "1400000000000000002",
  username: "brynja",
  global_name: "Brynja",
}

const LYRA = { id: "1400000000000000003", username: "lyra_gates" }

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const ISOLDE = { id: "1400000000000000006", username: "isolde" }

const RATE_LIMITED = new DiscordError({
  method: "GET",
  route: "/channels/{channel.id}/messages",
  status: 429,
  code: RESTJSONErrorCodes.MissingAccess,
  discordMessage: "You are being rate limited.",
  retryAfter: 4.4,
})

function ticketChannel(overrides = {}) {
  return supportTicketChannel({
    id: TICKET_ID,
    categoryId: CATEGORY_ID,
    openerId: LYRA.id,
    roleIds: [SUPPORT_ROLE_ID],
    ...overrides,
  })
}

function serverWith(state: FakeDiscordState = {}) {
  return new FakeDiscord({
    roles: [STAFF, SUPPORT],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, SUPPORT_ROLE_ID] },
      { user: BRYNJA, nick: "Brynja la Rousse", roles: [STAFF_ROLE_ID] },
      { user: LYRA },
      { user: CORVUS },
    ],
    ...state,
  })
}

async function readAs(
  discord: FakeDiscord,
  viewer = ALDIS,
  categoryId: string | null = CATEGORY_ID
) {
  const staffMember = await findStaffMember(discord, ROLES, viewer.id)
  if (staffMember === null) {
    throw new Error("The viewer is not a staff member.")
  }
  return await readOpenSupportTickets(discord, staffMember, categoryId)
}

async function ticketsOf(
  discord: FakeDiscord,
  viewer = ALDIS
): Promise<OpenSupportTicket[]> {
  const read = await readAs(discord, viewer)
  if (read.kind !== "read") {
    throw new Error("The tickets category is not configured.")
  }
  return read.tickets
}

function message(
  authorId: string | undefined,
  content: string,
  sentAt: string,
  overrides: Partial<FakeChannelMessage> = {}
): FakeChannelMessage {
  return {
    channelId: TICKET_ID,
    ...(authorId === undefined ? {} : { authorId }),
    content,
    sentAt: new Date(sentAt),
    ...overrides,
  }
}

test("without a tickets category in the configuration, the tickets are not configured, and Discord is not called", async () => {
  const discord = serverWith()
  const staffMember = await findStaffMember(discord, ROLES, ALDIS.id)
  if (staffMember === null) {
    throw new Error("The viewer is not a staff member.")
  }
  discord.failNext("getGuild", RATE_LIMITED)

  expect(await readOpenSupportTickets(discord, staffMember, null)).toEqual({
    kind: "unconfigured",
  })
  await expect(discord.getGuild()).rejects.toBe(RATE_LIMITED)
})

test("a category with no ticket in it reads as no ticket", async () => {
  const discord = serverWith({ channels: [] })

  expect(await ticketsOf(discord)).toEqual([])
})

test("a ticket shows its request kind, its opener by name, when it opened, when it was last active, how many messages it holds, the staff who answered, the last message with its author, and the link that opens its channel on Discord", async () => {
  const discord = serverWith({
    channels: [ticketChannel()],
    channelMessages: [
      message(undefined, "Bienvenue Lyra", "2026-11-03T14:32:10Z"),
      message(LYRA.id, "Mon launcher plante", "2026-11-03T14:40:00Z"),
      message(BRYNJA.id, "Tu as réinstallé ?", "2026-11-03T15:05:00Z"),
      message(LYRA.id, "Oui, ça plante toujours", "2026-11-04T08:15:30Z"),
    ],
  })

  expect(await ticketsOf(discord)).toEqual([
    {
      channelId: TICKET_ID,
      url: `https://discord.com/channels/${discord.guildId}/${TICKET_ID}`,
      requestKind: "🔧 Problème technique",
      opener: { id: LYRA.id, name: "lyra_gates" },
      openedAt: new Date("2026-11-02T10:00:00Z"),
      lastActivityAt: new Date("2026-11-04T08:15:30Z"),
      messageCount: 4,
      moreMessages: false,
      repliers: [{ id: BRYNJA.id, name: "Brynja la Rousse" }],
      lastMessage: {
        author: { id: LYRA.id, name: "lyra_gates" },
        byBot: false,
        text: "Oui, ça plante toujours",
      },
    },
  ])
})

function channelIdsOf(tickets: OpenSupportTicket[]) {
  return tickets.map(({ channelId }) => channelId)
}

test("a channel counts as a ticket only if it is a text channel of the category, named as ShorBot names one and opened for exactly one member", async () => {
  const ticketIds = Array.from({ length: 9 }, (_, index) =>
    channelIdAt(`2026-11-0${index + 1}T10:00:00Z`)
  )
  const [
    kept,
    otherCategory,
    voice,
    category,
    unnamed,
    hyphen,
    noOpener,
    twoOpeners,
    plain,
  ] = ticketIds as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
  const withoutOpener = ticketChannel({ id: noOpener })
  const withTwoOpeners = ticketChannel({ id: twoOpeners })
  const discord = serverWith({
    channels: [
      ticketChannel({ id: kept }),
      ticketChannel({ id: otherCategory, categoryId: OTHER_CATEGORY_ID }),
      { ...ticketChannel({ id: voice }), type: ChannelType.GuildVoice },
      { ...ticketChannel({ id: category }), type: ChannelType.GuildCategory },
      ticketChannel({ id: unnamed, name: "ticket-de-lyra" }),
      ticketChannel({ id: hyphen, name: "🔧-lyra" }),
      {
        ...withoutOpener,
        permission_overwrites: withoutOpener.permission_overwrites?.filter(
          ({ id }) => id !== LYRA.id
        ),
      },
      {
        ...withTwoOpeners,
        permission_overwrites: [
          ...(withTwoOpeners.permission_overwrites ?? []),
          {
            id: CORVUS.id,
            type: OverwriteType.Member,
            allow: PermissionFlagsBits.ViewChannel.toString(),
            deny: "0",
          },
        ],
      },
      ticketChannel({ id: plain, emoji: "❓", pseudo: "corvus" }),
    ],
  })

  expect(channelIdsOf(await ticketsOf(discord))).toEqual([kept, plain])
})

test("the tickets are listed from the oldest, which has waited longest, to the newest", async () => {
  const [newest, oldest, middle] = [
    channelIdAt("2026-11-04T10:00:00Z"),
    channelIdAt("2026-11-01T10:00:00Z"),
    channelIdAt("2026-11-02T10:00:00Z"),
  ] as [string, string, string]
  const discord = serverWith({
    channels: [
      ticketChannel({ id: newest }),
      ticketChannel({ id: oldest }),
      ticketChannel({ id: middle }),
    ],
  })

  expect(channelIdsOf(await ticketsOf(discord))).toEqual([
    oldest,
    middle,
    newest,
  ])
})

test("a ticket the viewer cannot view on Discord is not shown to them, and is shown to a viewer who can through a role of the ticket, as the owner, or as an administrator", async () => {
  const ADMINISTRATOR = {
    id: "1300000000000000002",
    name: "Admin",
    position: 6,
  }
  const discord = serverWith({
    ownerId: CORVUS.id,
    roles: [
      STAFF,
      SUPPORT,
      {
        ...ADMINISTRATOR,
        permissions: PermissionFlagsBits.Administrator.toString(),
      },
    ],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, SUPPORT_ROLE_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
      { user: LYRA },
      {
        user: CORVUS,
        roles: [STAFF_ROLE_ID],
      },
      { user: ISOLDE, roles: [STAFF_ROLE_ID, ADMINISTRATOR.id] },
    ],
    channels: [ticketChannel()],
  })

  expect(channelIdsOf(await ticketsOf(discord, ALDIS))).toEqual([TICKET_ID])
  expect(channelIdsOf(await ticketsOf(discord, BRYNJA))).toEqual([])
  expect(channelIdsOf(await ticketsOf(discord, CORVUS))).toEqual([TICKET_ID])
  expect(channelIdsOf(await ticketsOf(discord, ISOLDE))).toEqual([TICKET_ID])
})

test("a role the ticket denies the channel to does not see it, whatever another role of the viewer allows", async () => {
  const discord = serverWith({
    channels: [
      {
        ...ticketChannel(),
        permission_overwrites: [
          ...(ticketChannel().permission_overwrites ?? []),
          {
            id: STAFF_ROLE_ID,
            type: OverwriteType.Role,
            allow: "0",
            deny: PermissionFlagsBits.ViewChannel.toString(),
          },
        ],
      },
    ],
  })

  expect(channelIdsOf(await ticketsOf(discord, ALDIS))).toEqual([TICKET_ID])
  expect(channelIdsOf(await ticketsOf(discord, BRYNJA))).toEqual([])
})

test("a ticket with 99 messages counts them, and one with 100 counts 100 and says there may be more", async () => {
  const [short, full] = [
    channelIdAt("2026-11-01T10:00:00Z"),
    channelIdAt("2026-11-02T10:00:00Z"),
  ] as [string, string]
  const messagesOf = (channelId: string, count: number) =>
    Array.from({ length: count }, (_, index) =>
      message(LYRA.id, `Message ${index}`, "2026-11-03T10:00:00Z", {
        channelId,
      })
    )
  const discord = serverWith({
    channels: [ticketChannel({ id: short }), ticketChannel({ id: full })],
    channelMessages: [...messagesOf(short, 99), ...messagesOf(full, 130)],
  })

  const tickets = await ticketsOf(discord)

  expect(
    tickets.map(({ messageCount, moreMessages }) => [
      messageCount,
      moreMessages,
    ])
  ).toEqual([
    [99, false],
    [100, true],
  ])
  expect(tickets[1]?.lastMessage?.text).toBe("Message 129")
})

test("a ticket nobody wrote in has no last message and was last active when it opened", async () => {
  const discord = serverWith({ channels: [ticketChannel()] })

  const [ticket] = await ticketsOf(discord)

  expect(ticket).toMatchObject({
    messageCount: 0,
    moreMessages: false,
    lastActivityAt: new Date("2026-11-02T10:00:00Z"),
    repliers: [],
    lastMessage: null,
  })
})

test("the staff who answered are the staff members other than the opener who wrote in the ticket, each once, from the first to answer, where a bot, a member who does not hold the staff role and one who left the Discord server are not", async () => {
  const discord = serverWith({
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, SUPPORT_ROLE_ID] },
      { user: BRYNJA, nick: "Brynja la Rousse", roles: [STAFF_ROLE_ID] },
      { user: LYRA },
      { user: CORVUS },
    ],
    users: [HALDOR],
    channels: [ticketChannel()],
    channelMessages: [
      message(undefined, "Bienvenue", "2026-11-03T10:00:00Z"),
      message(LYRA.id, "Aide", "2026-11-03T10:01:00Z"),
      message(BRYNJA.id, "Je regarde", "2026-11-03T10:02:00Z"),
      message(CORVUS.id, "Moi aussi", "2026-11-03T10:03:00Z"),
      message(HALDOR.id, "Ancien du staff", "2026-11-03T10:04:00Z"),
      message(ALDIS.id, "Résolu ?", "2026-11-03T10:05:00Z"),
      message(BRYNJA.id, "Dis-moi", "2026-11-03T10:06:00Z"),
    ],
  })

  const [ticket] = await ticketsOf(discord)

  expect(ticket?.repliers).toEqual([
    { id: BRYNJA.id, name: "Brynja la Rousse" },
    { id: ALDIS.id, name: "aldis" },
  ])
})

test("a staff member who opened the ticket is its opener and not one of the staff who answered", async () => {
  const discord = serverWith({
    channels: [ticketChannel({ openerId: BRYNJA.id })],
    channelMessages: [
      message(BRYNJA.id, "Une question", "2026-11-03T10:00:00Z"),
    ],
  })

  const [ticket] = await ticketsOf(discord)

  expect(ticket?.opener).toEqual({ id: BRYNJA.id, name: "Brynja la Rousse" })
  expect(ticket?.repliers).toEqual([])
})

test("an opener who left the Discord server is named by their account, and one nobody finds by their ID", async () => {
  const [left, unknown] = [
    channelIdAt("2026-11-01T10:00:00Z"),
    channelIdAt("2026-11-02T10:00:00Z"),
  ] as [string, string]
  const discord = serverWith({
    users: [HALDOR],
    channels: [
      ticketChannel({ id: left, openerId: HALDOR.id }),
      ticketChannel({ id: unknown, openerId: "1400000000000000777" }),
    ],
  })

  const tickets = await ticketsOf(discord)

  expect(tickets.map(({ opener }) => opener)).toEqual([
    { id: HALDOR.id, name: "haldor" },
    { id: "1400000000000000777", name: "1400000000000000777" },
  ])
})

test("the last message is the application's own when it wrote last, named as the account is, and its text reads the mentions and the embeds a bot writes", async () => {
  const discord = serverWith({
    channels: [ticketChannel()],
    channelMessages: [
      message(
        undefined,
        `<@${LYRA.id}> <@&${SUPPORT_ROLE_ID}>`,
        "2026-11-03T10:00:00Z",
        {
          embeds: [
            { description: `Bienvenue <@${LYRA.id}>, explique ton problème.` },
          ],
        }
      ),
    ],
  })

  const [ticket] = await ticketsOf(discord)

  expect(ticket?.lastMessage).toEqual({
    author: {
      id: discord.applicationUser.id,
      name: discord.applicationUser.username,
    },
    byBot: true,
    text: "@lyra_gates @Support Bienvenue @lyra_gates, explique ton problème.",
  })
  expect(ticket?.repliers).toEqual([])
})

test("a member who left the Discord server and wrote the last message is named as their messages name them", async () => {
  const discord = serverWith({
    users: [HALDOR],
    channels: [ticketChannel()],
    channelMessages: [message(HALDOR.id, "Au revoir", "2026-11-03T10:00:00Z")],
  })

  const [ticket] = await ticketsOf(discord)

  expect(ticket?.lastMessage?.author).toEqual({ id: HALDOR.id, name: "haldor" })
})

test("a ticket whose channel is gone when its messages are read, because it has just been closed, is left out, and the others are read", async () => {
  const [closing, open] = [
    channelIdAt("2026-11-01T10:00:00Z"),
    channelIdAt("2026-11-02T10:00:00Z"),
  ] as [string, string]

  class ClosingTicketDiscord extends FakeDiscord {
    override listMessages(...args: Parameters<FakeDiscord["listMessages"]>) {
      return args[0] === closing
        ? Promise.reject(
            new DiscordError({
              method: "GET",
              route: "/channels/{channel.id}/messages",
              status: 404,
              code: RESTJSONErrorCodes.UnknownChannel,
              discordMessage: "Unknown Channel",
            })
          )
        : super.listMessages(...args)
    }
  }
  const discord = new ClosingTicketDiscord({
    roles: [STAFF, SUPPORT],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, SUPPORT_ROLE_ID] },
      { user: LYRA },
    ],
    channels: [ticketChannel({ id: closing }), ticketChannel({ id: open })],
  })

  expect(channelIdsOf(await ticketsOf(discord))).toEqual([open])
})

test("a failure of Discord while the channels or the messages are read is thrown, and no partial list is returned", async () => {
  const unavailable = new DiscordError({
    method: "GET",
    route: "/guilds/{guild.id}/channels",
    status: 503,
  })
  const channels = serverWith({ channels: [ticketChannel()] })
  channels.failNext("listChannels", unavailable)
  const messages = serverWith({ channels: [ticketChannel()] })
  messages.failNext("listMessages", RATE_LIMITED)

  await expect(readAs(channels)).rejects.toBe(unavailable)
  await expect(readAs(messages)).rejects.toBe(RATE_LIMITED)
})
