import { expect, test } from "vitest"

import type { ChannelMessage, MessageSearchQuery } from "./discord-api"
import { DiscordError } from "./discord-error"
import { FakeDiscord, type FakeChannelMessage } from "./fake-discord"
import { MAX_SEARCHES, SEARCH_PAGE_SIZE } from "./message-search-limits"
import { ROUTES } from "./routes"
import { scanMessages } from "./scan-messages"

const CHANNEL_ID = "1568022814483685377"

const AUTHOR_ID = "1568023050346307647"

const NO_PERIOD = { start: null, end: null }

class SpiedDiscord extends FakeDiscord {
  readonly searches: MessageSearchQuery[] = []

  override searchMessages(query: MessageSearchQuery) {
    this.searches.push(query)
    return super.searchMessages(query)
  }
}

function discordWith(messages: FakeChannelMessage[]) {
  return new SpiedDiscord({
    channels: [CHANNEL_ID],
    channelMessages: messages,
  })
}

function message(index: number, content: string): FakeChannelMessage {
  return {
    channelId: CHANNEL_ID,
    authorId: AUTHOR_ID,
    content,
    sentAt: new Date(Date.UTC(2026, 10, 1, 8, 0, index)),
  }
}

function keepWord(word: string) {
  return ({ id, content }: ChannelMessage) =>
    content.includes(word) ? { messageId: id } : null
}

async function scan(
  discord: FakeDiscord,
  keep: (message: ChannelMessage) => { messageId: string } | null,
  extra: Partial<Parameters<typeof scanMessages>[1]> = {}
) {
  return await scanMessages(discord, {
    channelId: CHANNEL_ID,
    authorId: AUTHOR_ID,
    served: undefined,
    period: NO_PERIOD,
    before: null,
    keep,
    ...extra,
  })
}

test("a scan asks Discord for the channel, the author, the served term and the newest messages first", async () => {
  const discord = discordWith([message(0, "alpha beta")])

  await scan(discord, keepWord("alpha"), { served: "beta" })

  expect(discord.searches).toEqual([
    {
      channel_id: [CHANNEL_ID],
      author_id: [AUTHOR_ID],
      content: "beta",
      sort_order: "desc",
      limit: SEARCH_PAGE_SIZE,
      offset: 0,
    },
  ])
})

test("a scan with no served term asks for no text", async () => {
  const discord = discordWith([message(0, "alpha")])

  await scan(discord, keepWord("alpha"))

  expect(discord.searches[0]).not.toHaveProperty("content")
})

test("a scan keeps the messages the filter keeps, newest first, and ends when a search comes back short", async () => {
  const discord = discordWith([
    message(0, "alpha"),
    message(1, "gamma"),
    message(2, "alpha"),
  ])

  const result = await scan(discord, keepWord("alpha"))

  expect(result.entries).toHaveLength(2)
  expect(result.older).toBeNull()
  expect(result.cut).toBe(false)
  expect(discord.searches).toHaveLength(1)
})

test("a scan stops on a full page of kept messages and leads to the older ones from the last kept", async () => {
  const discord = discordWith(
    Array.from({ length: 40 }, (_, index) => message(index, "alpha"))
  )

  const result = await scan(discord, keepWord("alpha"))

  expect(result.entries).toHaveLength(SEARCH_PAGE_SIZE)
  expect(result.older).toBe(result.entries.at(-1)?.messageId)
  expect(result.cut).toBe(false)
  expect(discord.searches).toHaveLength(1)
})

test("a scan reads on, from the oldest message of each search, while the page is not full", async () => {
  const discord = discordWith([
    message(0, "alpha"),
    ...Array.from({ length: SEARCH_PAGE_SIZE + 5 }, (_, index) =>
      message(index + 1, "gamma")
    ),
  ])

  const result = await scan(discord, keepWord("alpha"))

  expect(discord.searches).toHaveLength(2)
  expect(discord.searches[1]?.max_id).toBeDefined()
  expect(result.entries).toHaveLength(1)
  expect(result.older).toBeNull()
  expect(result.cut).toBe(false)
})

test("a scan stops after the most searches a view may make, and says it was cut, leading on from the last message read", async () => {
  const discord = discordWith(
    Array.from({ length: MAX_SEARCHES * SEARCH_PAGE_SIZE + 5 }, (_, index) =>
      message(index, "gamma")
    )
  )

  const result = await scan(discord, keepWord("alpha"))

  expect(discord.searches).toHaveLength(MAX_SEARCHES)
  expect(result.entries).toEqual([])
  expect(result.cut).toBe(true)
  expect(result.older).not.toBeNull()
})

test("a scan reads under its cursor alone, and the older page continues from the last message kept without repeating or skipping one", async () => {
  const discord = discordWith(
    Array.from({ length: 40 }, (_, index) => message(index, "alpha"))
  )

  const first = await scan(discord, keepWord("alpha"))
  const second = await scan(discord, keepWord("alpha"), {
    before: first.older,
  })

  expect(first.entries).toHaveLength(SEARCH_PAGE_SIZE)
  expect(second.entries).toHaveLength(40 - SEARCH_PAGE_SIZE)
  expect(
    second.entries.every(
      ({ messageId }) => BigInt(messageId) < BigInt(first.older ?? "0")
    )
  ).toBe(true)
  expect(discord.searches.at(-1)?.max_id).toBe(first.older)
  expect(second.older).toBeNull()
})

test("a scan asks Discord nothing when the period ends before it starts", async () => {
  const discord = discordWith([message(0, "alpha")])

  const result = await scan(discord, keepWord("alpha"), {
    period: {
      start: new Date("2026-11-03T00:00:00Z"),
      end: new Date("2026-11-02T00:00:00Z"),
    },
  })

  expect(discord.searches).toEqual([])
  expect(result).toEqual({ entries: [], older: null, cut: false })
})

test("a search that fails is thrown", async () => {
  const discord = discordWith([message(0, "alpha")])
  discord.failNext(
    "searchMessages",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildMessagesSearch,
      status: 503,
    })
  )

  await expect(scan(discord, keepWord("alpha"))).rejects.toThrow()
})
