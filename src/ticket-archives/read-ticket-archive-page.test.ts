import { RESTJSONErrorCodes } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { archiveEmbed, archiveMessage } from "./archive-message"
import { readTicketArchivePage } from "./read-ticket-archive-page"

const CHANNEL_ID = "1562505523490848881"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = {
  id: "1400000000000000002",
  username: "brynja",
  global_name: "Brynja",
}

const CORVUS = { id: "1400000000000000003", username: "corvus" }

const LYRA = { id: "1400000000000000004", username: "lyra_gates" }

const RATE_LIMITED = new DiscordError({
  method: "GET",
  route: "/guilds/{guild.id}/messages/search",
  status: 429,
  code: RESTJSONErrorCodes.MissingAccess,
  discordMessage: "You are being rate limited.",
  retryAfter: 4.4,
})

function archive(reason: string, overrides = {}): FakeChannelMessage {
  return archiveMessage({
    channelId: CHANNEL_ID,
    openerId: ALDIS.id,
    reason,
    ...overrides,
  })
}

function serverWith(count: number) {
  return new FakeDiscord({
    members: [{ user: ALDIS }],
    channels: [CHANNEL_ID],
    channelMessages: Array.from({ length: count }, (_, index) =>
      archive(`Archive ${index}`, { closerId: ALDIS.id })
    ),
  })
}

async function pageOf(discord: FakeDiscord, page?: unknown) {
  const read = await readTicketArchivePage(discord, CHANNEL_ID, page)
  if (read.kind !== "page") {
    throw new Error("The archives are not configured.")
  }
  return read
}

function reasonsOf({ archives }: { archives: { reason: string }[] }) {
  return archives.map(({ reason }) => reason)
}

test("without an archives channel in the configuration, the archives are not configured, and Discord is not called", async () => {
  const discord = new FakeDiscord()
  discord.failNext("getApplicationUser", RATE_LIMITED)

  expect(await readTicketArchivePage(discord, null, undefined)).toEqual({
    kind: "unconfigured",
  })
  await expect(discord.getApplicationUser()).rejects.toBe(RATE_LIMITED)
})

test("the first page holds the newest archives, each with its request kind, who opened it and who closed it by name, its dates and its reason", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS }, { user: BRYNJA, nick: "Brynja la Rousse" }],
    channels: [CHANNEL_ID],
    channelMessages: [
      archive("Résolu", {
        kind: "🔧 Problème technique",
        openedAt: new Date("2026-11-01T09:00:00Z"),
        closedAt: new Date("2026-11-01T09:30:00Z"),
        closerId: ALDIS.id,
      }),
      archive("Joueur averti", {
        openerId: BRYNJA.id,
        kind: "🚨 Signaler un joueur",
        openedAt: new Date("2026-11-03T14:32:10Z"),
        closedAt: new Date("2026-11-03T15:10:59Z"),
        closerId: ALDIS.id,
      }),
    ],
  })

  expect(await pageOf(discord)).toEqual({
    kind: "page",
    page: 1,
    pages: 1,
    first: 1,
    last: 2,
    total: 2,
    complete: true,
    archives: [
      {
        messageId: expect.any(String),
        requestKind: "🚨 Signaler un joueur",
        opener: { id: BRYNJA.id, name: "Brynja la Rousse" },
        closer: { id: ALDIS.id, name: "aldis" },
        openedAt: new Date("2026-11-03T14:32:10Z"),
        closedAt: new Date("2026-11-03T15:10:59Z"),
        reason: "Joueur averti",
      },
      {
        messageId: expect.any(String),
        requestKind: "🔧 Problème technique",
        opener: { id: ALDIS.id, name: "aldis" },
        closer: { id: ALDIS.id, name: "aldis" },
        openedAt: new Date("2026-11-01T09:00:00Z"),
        closedAt: new Date("2026-11-01T09:30:00Z"),
        reason: "Résolu",
      },
    ],
  })
})

test("an opener or a closer is named by their nickname, else by their account's name, whether or not they are still a member, else by none", async () => {
  const discord = new FakeDiscord({
    members: [{ user: BRYNJA, nick: "Brynja la Rousse" }],
    users: [CORVUS],
    channels: [CHANNEL_ID],
    channelMessages: [
      archive("Premier", { openerId: CORVUS.id, closerId: BRYNJA.id }),
      archive("Dernier", { openerId: LYRA.id, closerId: CORVUS.id }),
    ],
  })

  const { archives } = await pageOf(discord)

  expect(archives.map(({ opener, closer }) => [opener, closer])).toEqual([
    [
      { id: LYRA.id, name: null },
      { id: CORVUS.id, name: "corvus" },
    ],
    [
      { id: CORVUS.id, name: "corvus" },
      { id: BRYNJA.id, name: "Brynja la Rousse" },
    ],
  ])
})

test("a request kind of « Inconnu » reads as no request kind", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [archive("Sans type", { kind: null })],
  })

  expect((await pageOf(discord)).archives).toMatchObject([
    { requestKind: null },
  ])
})

test("an archives channel with no message has one empty page", async () => {
  expect(await pageOf(serverWith(0))).toEqual({
    kind: "page",
    page: 1,
    pages: 1,
    first: 0,
    last: 0,
    total: 0,
    complete: true,
    archives: [],
  })
})

test("a page holds 25 archives, and the archives are paged through, newest first, to the oldest", async () => {
  const discord = serverWith(60)

  const [first, second, third] = [
    await pageOf(discord, "1"),
    await pageOf(discord, "2"),
    await pageOf(discord, "3"),
  ]

  expect(
    [first, second, third].map(({ page, pages }) => [page, pages])
  ).toEqual([
    [1, 3],
    [2, 3],
    [3, 3],
  ])
  expect(
    [first, second, third].map(({ first, last, total }) => [first, last, total])
  ).toEqual([
    [1, 25, 60],
    [26, 50, 60],
    [51, 60, 60],
  ])
  expect([first, second, third].flatMap(reasonsOf)).toEqual(
    Array.from({ length: 60 }, (_, index) => `Archive ${59 - index}`)
  )
})

test("no page asked for is the first page", async () => {
  expect((await pageOf(serverWith(60))).page).toBe(1)
})

const NOT_A_PAGE = [
  "0",
  "-1",
  "abc",
  "2.5",
  "1e1",
  "",
  " 2",
  "401",
  "99999999999999999999",
  ["2", "3"],
  null,
] as const

for (const requested of NOT_A_PAGE) {
  test(`a page asked for as ${JSON.stringify(requested)} counts as absent: the first page is read`, async () => {
    const read = await pageOf(serverWith(60), requested)

    expect(read.page).toBe(1)
    expect(reasonsOf(read)[0]).toBe("Archive 59")
  })
}

test("a page past the last, because the archives are fewer than asked for, reads the first page", async () => {
  const read = await pageOf(serverWith(60), "4")

  expect(read).toMatchObject({ page: 1, pages: 3, first: 1, last: 25 })
  expect(reasonsOf(read)[0]).toBe("Archive 59")
})

test("a page past the last of an empty channel reads the first page, with no archive", async () => {
  expect(await pageOf(serverWith(0), "2")).toMatchObject({
    page: 1,
    pages: 1,
    total: 0,
    archives: [],
  })
})

test("a message another author posted is no archive: a member's look-alike is left out of the page and of the total", async () => {
  const discord = new FakeDiscord({
    members: [{ user: LYRA }],
    channels: [CHANNEL_ID],
    channelMessages: [
      archive("Forgée par un membre", { authorId: LYRA.id }),
      archive("Postée par l’application"),
    ],
  })

  const read = await pageOf(discord)

  expect(reasonsOf(read)).toEqual(["Postée par l’application"])
  expect(read).toMatchObject({ total: 1, first: 1, last: 1 })
})

test("a message of the application that follows no contract is left out of the page, and counted in its ranks and its total", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [
      archive("La seule"),
      { channelId: CHANNEL_ID, content: "Un texte" },
      {
        channelId: CHANNEL_ID,
        embeds: [{ ...archiveEmbed({ openerId: ALDIS.id }), title: "Autre" }],
      },
    ],
  })

  const read = await pageOf(discord)

  expect(reasonsOf(read)).toEqual(["La seule"])
  expect(read).toMatchObject({ total: 3, first: 1, last: 3, pages: 1 })
})

test("Discord's search reaches the 10,000 newest archives, 400 pages: the last page is the 400th, the archives are said to be incomplete, and a page past it reads the first", async () => {
  const discord = serverWith(10_001)

  const last = await pageOf(discord, "400")
  const past = await pageOf(discord, "401")

  expect(last).toMatchObject({
    page: 400,
    pages: 400,
    first: 9_976,
    last: 10_000,
    total: 10_001,
    complete: false,
  })
  expect(reasonsOf(last)).toHaveLength(25)
  expect(reasonsOf(last).at(-1)).toBe("Archive 1")
  expect(past).toMatchObject({ page: 1, pages: 400, complete: false })
})

test("10,000 archives are all reachable: the archives are complete", async () => {
  const read = await pageOf(serverWith(10_000), "400")

  expect(read).toMatchObject({
    pages: 400,
    first: 9_976,
    last: 10_000,
    complete: true,
  })
  expect(reasonsOf(read).at(-1)).toBe("Archive 0")
})

test("a rate limit that comes back fails the read with Discord's error", async () => {
  const discord = serverWith(3)
  discord.failNext("searchMessages", RATE_LIMITED)

  await expect(pageOf(discord)).rejects.toBe(RATE_LIMITED)
})

test("the application's own user failing fails the read with Discord's error", async () => {
  const discord = serverWith(3)
  discord.failNext("getApplicationUser", RATE_LIMITED)

  await expect(pageOf(discord)).rejects.toBe(RATE_LIMITED)
})

test("a name that cannot be read fails the read with Discord's error", async () => {
  const discord = serverWith(3)
  discord.failNext("getMember", RATE_LIMITED)

  await expect(pageOf(discord)).rejects.toBe(RATE_LIMITED)
})

test("a channel that does not exist fails the read as Missing Access", async () => {
  await expect(
    readTicketArchivePage(new FakeDiscord(), CHANNEL_ID, undefined)
  ).rejects.toMatchObject({
    status: 403,
    code: RESTJSONErrorCodes.MissingAccess,
  })
})
