import { RESTJSONErrorCodes } from "discord-api-types/v10"
import { expect, test } from "vitest"

import type { MessageSearchQuery } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import {
  FakeDiscord,
  type FakeChannelMessage,
  type FakeDiscordState,
} from "@/discord/fake-discord"
import { archiveEmbed, archiveMessage } from "./archive-message"
import {
  ARCHIVES_PER_PAGE,
  searchTicketArchives,
  type SearchFilters,
} from "./search-ticket-archives"

const CHANNEL_ID = "1562505523490848881"

const OTHER_CHANNEL_ID = "1562505523490848882"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = { id: "1400000000000000004", username: "lyra_gates" }

function archive(reason: string, overrides = {}): FakeChannelMessage {
  return archiveMessage({
    channelId: CHANNEL_ID,
    openerId: ALDIS.id,
    reason,
    ...overrides,
  })
}

class SearchIgnoringAuthors extends FakeDiscord {
  override searchMessages(query: MessageSearchQuery) {
    return super.searchMessages({ ...query, author_id: [] })
  }
}

async function searchOf(
  discord: FakeDiscord,
  offset = 0,
  channelId = CHANNEL_ID,
  filters: SearchFilters = {}
) {
  const { id } = await discord.getApplicationUser()
  return await searchTicketArchives(discord, channelId, id, offset, filters)
}

function reasonsOf({ archives }: { archives: { reason: string }[] }) {
  return archives.map(({ reason }) => reason)
}

function stateWith(...messages: FakeChannelMessage[]): FakeDiscordState {
  return {
    channels: [CHANNEL_ID, OTHER_CHANNEL_ID],
    channelMessages: messages,
  }
}

test("the archives are the messages the application posted in the archives channel, newest first, each with its request kind, its dates, who closed it and why", async () => {
  const discord = new FakeDiscord(
    stateWith(
      archive("Résolu", {
        kind: "🔧 Problème technique",
        openedAt: new Date("2026-11-01T09:00:00Z"),
        closedAt: new Date("2026-11-01T09:30:00Z"),
        closerId: LYRA.id,
      }),
      archive("Joueur averti", { kind: null })
    )
  )

  const found = await searchOf(discord)

  expect(found).toMatchObject({ total: 2, messages: 2 })
  expect(found.archives).toMatchObject([
    { reason: "Joueur averti", requestKind: null, openerId: ALDIS.id },
    {
      reason: "Résolu",
      requestKind: "🔧 Problème technique",
      openerId: ALDIS.id,
      closerId: LYRA.id,
      openedAt: new Date("2026-11-01T09:00:00Z"),
      closedAt: new Date("2026-11-01T09:30:00Z"),
    },
  ])
})

test("a page holds 25 archives, and the offset starts the next one after those before it", async () => {
  const discord = new FakeDiscord(
    stateWith(
      ...Array.from({ length: 60 }, (_, index) => archive(`Archive ${index}`))
    )
  )

  const first = await searchOf(discord)
  const second = await searchOf(discord, ARCHIVES_PER_PAGE)
  const third = await searchOf(discord, 2 * ARCHIVES_PER_PAGE)

  expect(ARCHIVES_PER_PAGE).toBe(25)
  expect([first.total, second.total, third.total]).toEqual([60, 60, 60])
  expect(reasonsOf(first)).toEqual(
    Array.from({ length: 25 }, (_, index) => `Archive ${59 - index}`)
  )
  expect(reasonsOf(second)[0]).toBe("Archive 34")
  expect(reasonsOf(second)).toHaveLength(25)
  expect(reasonsOf(third)).toEqual(
    Array.from({ length: 10 }, (_, index) => `Archive ${9 - index}`)
  )
})

test("an offset past the last archive finds none, and still says how many there are", async () => {
  const discord = new FakeDiscord(stateWith(archive("La seule")))

  expect(await searchOf(discord, 2 * ARCHIVES_PER_PAGE)).toEqual({
    total: 1,
    messages: 0,
    archives: [],
  })
})

test("a message another author posted is no archive: a member's look-alike is left out", async () => {
  const discord = new FakeDiscord({
    ...stateWith(
      archive("Forgée par un membre", { authorId: LYRA.id }),
      archive("Postée par l’application")
    ),
    members: [{ user: LYRA }],
  })

  const found = await searchOf(discord)

  expect(reasonsOf(found)).toEqual(["Postée par l’application"])
  expect(found.total).toBe(1)
})

test("a message another author posted is left out even if Discord's search let it through", async () => {
  const discord = new SearchIgnoringAuthors({
    ...stateWith(
      archive("Forgée par un membre", { authorId: LYRA.id }),
      archive("Postée par l’application")
    ),
    members: [{ user: LYRA }],
  })

  const found = await searchOf(discord)

  expect(reasonsOf(found)).toEqual(["Postée par l’application"])
  expect(found.messages).toBe(2)
})

test("only the archives channel is searched: an archive posted in another channel is left out", async () => {
  const discord = new FakeDiscord(
    stateWith(
      archive("Ailleurs", { channelId: OTHER_CHANNEL_ID }),
      archive("Ici")
    )
  )

  const found = await searchOf(discord)

  expect(reasonsOf(found)).toEqual(["Ici"])
  expect(found.total).toBe(1)
})

test("a message of the application that follows no contract is left out of the archives, and counted in the messages and the total", async () => {
  const discord = new FakeDiscord(
    stateWith(
      archive("La seule"),
      { channelId: CHANNEL_ID, content: "Un texte" },
      {
        channelId: CHANNEL_ID,
        embeds: [{ ...archiveEmbed({ openerId: ALDIS.id }), title: "Autre" }],
      }
    )
  )

  const found = await searchOf(discord)

  expect(reasonsOf(found)).toEqual(["La seule"])
  expect(found).toMatchObject({ total: 3, messages: 3 })
})

test("a channel the application cannot search fails with Discord's error", async () => {
  const discord = new FakeDiscord(stateWith())
  const missingAccess = new DiscordError({
    method: "GET",
    route: "/guilds/{guild.id}/messages/search",
    status: 403,
    code: RESTJSONErrorCodes.MissingAccess,
    discordMessage: "Missing Access",
  })
  discord.failNext("searchMessages", missingAccess)

  await expect(searchOf(discord)).rejects.toBe(missingAccess)
})

test("a channel that does not exist fails as Missing Access, as Discord answers a search of one", async () => {
  await expect(
    searchOf(new FakeDiscord(), 0, CHANNEL_ID)
  ).rejects.toMatchObject({
    status: 403,
    code: RESTJSONErrorCodes.MissingAccess,
  })
})

test("a text narrows the archives to those that hold it as a word, in whichever field: an ID found as the opener, as the closer or in the reason", async () => {
  const discord = new FakeDiscord(
    stateWith(
      archive("Ouverte par Aldis", { openerId: ALDIS.id, closerId: LYRA.id }),
      archive("Fermée par Aldis", { openerId: LYRA.id, closerId: ALDIS.id }),
      archive(`Cite ${ALDIS.id} dans son motif`, {
        openerId: LYRA.id,
        closerId: LYRA.id,
      }),
      archive("Sans Aldis", { openerId: LYRA.id, closerId: LYRA.id })
    )
  )

  const found = await searchOf(discord, 0, CHANNEL_ID, { text: ALDIS.id })

  expect(reasonsOf(found)).toEqual([
    `Cite ${ALDIS.id} dans son motif`,
    "Fermée par Aldis",
    "Ouverte par Aldis",
  ])
  expect(found.total).toBe(3)
})

test("an ID is a whole word: the start of an ID finds nothing", async () => {
  const discord = new FakeDiscord(
    stateWith(archive("Pour Lyra", { openerId: LYRA.id, closerId: LYRA.id }))
  )

  const found = await searchOf(discord, 0, CHANNEL_ID, {
    text: LYRA.id.slice(0, -1),
  })

  expect(found).toEqual({ total: 0, messages: 0, archives: [] })
})

test("the bounds keep the archives sent after the lower one and before the upper one, and the oldest come first when asked", async () => {
  const discord = new FakeDiscord(
    stateWith(
      archive("Septembre", { sentAt: new Date("2026-09-15T10:00:00Z") }),
      archive("Octobre", { sentAt: new Date("2026-10-15T10:00:00Z") }),
      archive("Novembre", { sentAt: new Date("2026-11-15T10:00:00Z") })
    )
  )
  const all = await discord.searchMessages({})
  const [november, , september] = all.messages

  const between = await searchOf(discord, 0, CHANNEL_ID, {
    minId: september?.id ?? "",
    maxId: november?.id ?? "",
  })
  const since = await searchOf(discord, 0, CHANNEL_ID, {
    minId: september?.id ?? "",
    oldestFirst: true,
  })

  expect(reasonsOf(between)).toEqual(["Octobre"])
  expect(between.total).toBe(1)
  expect(reasonsOf(since)).toEqual(["Octobre", "Novembre"])
})
