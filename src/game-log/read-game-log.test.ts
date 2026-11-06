import { expect, test } from "vitest"

import type { MessageSearchQuery } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { gameLogMessage } from "./game-log-message"
import { readGameLog, type GameLogPage } from "./read-game-log"

const CHANNEL_ID = "1568022814483685377"

const OTHER_CHANNEL_ID = "1568022878765719651"

const WEBHOOK_ID = "1568023050346307647"

const CONFIG = { channelId: CHANNEL_ID, webhookId: WEBHOOK_ID }

const FORGER_ID = "1400000000000000009"

function discordWith(messages: FakeChannelMessage[]) {
  return new FakeDiscord({
    channels: [CHANNEL_ID, OTHER_CHANNEL_ID],
    channelMessages: messages,
  })
}

function logged(sentAt: string, line: Parameters<typeof gameLogMessage>[0]) {
  return gameLogMessage({ ...line, sentAt: new Date(sentAt) })
}

function hashesOf({ days }: GameLogPage) {
  return days.flatMap(({ entries }) =>
    entries.map((entry) =>
      entry.kind === "event" ? entry.eventId : `raw:${entry.title}`
    )
  )
}

function gameLogLine(
  sentAt: string,
  hash: string,
  extra: Partial<Parameters<typeof gameLogMessage>[0]> = {}
) {
  return logged(sentAt, {
    channelId: CHANNEL_ID,
    webhookId: WEBHOOK_ID,
    hash,
    ...extra,
  })
}

test("the game log is the webhook's messages in its channel, newest first, grouped by day of Paris", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-02T22:30:00Z", "aaaaaaaa"),
    gameLogLine("2026-11-02T23:30:00Z", "bbbbbbbb"),
    gameLogLine("2026-11-03T08:00:00Z", "cccccccc"),
  ])

  const page = await readGameLog(discord, CONFIG, {})

  expect(page.days.map(({ date }) => date.toISOString())).toEqual([
    "2026-11-03T08:00:00.000Z",
    "2026-11-02T22:30:00.000Z",
  ])
  expect(page.days.map(({ entries }) => entries.length)).toEqual([2, 1])
  expect(hashesOf(page)).toEqual(["cccccccc", "bbbbbbbb", "aaaaaaaa"])
})

test("a message of another author is left out, though its embed is the game server's to the letter", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-03T08:00:00Z", "11111111"),
    {
      ...gameLogLine("2026-11-03T09:00:00Z", "22222222"),
      authorId: FORGER_ID,
    },
  ])

  expect(hashesOf(await readGameLog(discord, CONFIG, {}))).toEqual(["11111111"])
})

test("a message of another author is left out even when Discord's search lets it through", async () => {
  class SloppySearch extends FakeDiscord {
    override searchMessages(query: MessageSearchQuery) {
      const withoutAuthor = { ...query }
      delete withoutAuthor.author_id
      return super.searchMessages(withoutAuthor)
    }
  }
  const discord = new SloppySearch({
    channels: [CHANNEL_ID],
    channelMessages: [
      gameLogLine("2026-11-03T08:00:00Z", "11111111"),
      {
        ...gameLogLine("2026-11-03T09:00:00Z", "22222222"),
        authorId: FORGER_ID,
      },
    ],
  })

  expect(hashesOf(await readGameLog(discord, CONFIG, {}))).toEqual(["11111111"])
})

test("the messages of the webhook in another channel are left out", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-03T08:00:00Z", "11111111"),
    {
      ...gameLogLine("2026-11-03T09:00:00Z", "22222222"),
      channelId: OTHER_CHANNEL_ID,
    },
  ])

  expect(hashesOf(await readGameLog(discord, CONFIG, {}))).toEqual(["11111111"])
})

test("a line out of format is read raw beside the others, without failing the page", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-03T08:00:00Z", "11111111"),
    {
      channelId: CHANNEL_ID,
      authorId: WEBHOOK_ID,
      sentAt: new Date("2026-11-03T09:00:00Z"),
      embeds: [{ title: "Serveur redémarré", description: "Planifié" }],
    },
  ])

  const page = await readGameLog(discord, CONFIG, {})

  expect(hashesOf(page)).toEqual(["raw:Serveur redémarré", "11111111"])
})

test("a text finds the lines whose words it holds, wherever they sit in the embed", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-03T08:00:00Z", "11111111", {
      action: "administration:heal",
    }),
    gameLogLine("2026-11-03T09:00:00Z", "22222222", {
      category: "Personnages",
      action: "character:disconnect",
      character: "Lyra",
    }),
  ])

  expect(
    hashesOf(await readGameLog(discord, CONFIG, { text: "heal" }))
  ).toEqual(["11111111"])
  expect(
    hashesOf(await readGameLog(discord, CONFIG, { text: "lyra" }))
  ).toEqual(["22222222"])
  expect((await readGameLog(discord, CONFIG, { text: "heal" })).text).toBe(
    "heal"
  )
})

test("a text with no word in it counts as absent", async () => {
  const discord = discordWith([gameLogLine("2026-11-03T08:00:00Z", "11111111")])

  const page = await readGameLog(discord, CONFIG, { text: "§§ !!" })

  expect(page.text).toBeNull()
  expect(hashesOf(page)).toEqual(["11111111"])
})

const EDGES = [
  gameLogLine("2026-11-02T22:59:59Z", "aaaaaaaa"),
  gameLogLine("2026-11-02T23:00:00Z", "bbbbbbbb"),
  gameLogLine("2026-11-03T22:59:59Z", "cccccccc"),
  gameLogLine("2026-11-03T23:00:00Z", "dddddddd"),
]

test("a period keeps the lines from the first midnight of its first day of Paris to the last midnight of its last, both days included", async () => {
  const discord = discordWith(EDGES)

  const page = await readGameLog(discord, CONFIG, {
    from: "2026-11-03",
    to: "2026-11-03",
  })

  expect(hashesOf(page)).toEqual(["cccccccc", "bbbbbbbb"])
  expect(page).toMatchObject({ from: "2026-11-03", to: "2026-11-03" })
})

test("a period with a first day alone reads to the newest line, and one with a last day alone from the oldest", async () => {
  const discord = discordWith(EDGES)

  expect(
    hashesOf(await readGameLog(discord, CONFIG, { from: "2026-11-03" }))
  ).toEqual(["dddddddd", "cccccccc", "bbbbbbbb"])
  expect(
    hashesOf(await readGameLog(discord, CONFIG, { to: "2026-11-02" }))
  ).toEqual(["aaaaaaaa"])
})

test("a day that does not exist, or is not a day, counts as absent", async () => {
  const discord = discordWith(EDGES)

  const page = await readGameLog(discord, CONFIG, {
    from: "2026-02-30",
    to: "demain",
  })

  expect(page).toMatchObject({ from: null, to: null })
  expect(hashesOf(page)).toHaveLength(4)
})

test("a period and a text combine", async () => {
  const discord = discordWith([
    ...EDGES,
    gameLogLine("2026-11-03T12:00:00Z", "eeeeeeee", {
      action: "character:disconnect",
    }),
  ])

  const page = await readGameLog(discord, CONFIG, {
    from: "2026-11-03",
    to: "2026-11-03",
    text: "disconnect",
  })

  expect(hashesOf(page)).toEqual(["eeeeeeee"])
})

test("the cursor of an older page and the end of the period both bound it, the nearer one winning", async () => {
  const discord = discordWith(EDGES)
  const bbbb = (await readGameLog(discord, CONFIG, {})).days
    .flatMap(({ entries }) => entries)
    .find((entry) => entry.kind === "event" && entry.eventId === "bbbbbbbb")
  const cccc = (await readGameLog(discord, CONFIG, {})).days
    .flatMap(({ entries }) => entries)
    .find((entry) => entry.kind === "event" && entry.eventId === "cccccccc")

  expect(
    hashesOf(
      await readGameLog(discord, CONFIG, {
        to: "2026-11-03",
        before: bbbb?.messageId,
      })
    )
  ).toEqual(["aaaaaaaa"])
  expect(
    hashesOf(
      await readGameLog(discord, CONFIG, {
        to: "2026-11-02",
        before: cccc?.messageId,
      })
    )
  ).toEqual(["aaaaaaaa"])
})

test("a period that ends before it starts reads nothing, and Discord is not asked", async () => {
  const discord = discordWith(EDGES)
  discord.failNext(
    "searchMessages",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildMessagesSearch,
      status: 503,
    })
  )

  const page = await readGameLog(discord, CONFIG, {
    from: "2026-11-03",
    to: "2026-11-02",
  })

  expect(page.days).toEqual([])
  expect(page.older).toBeNull()
  await expect(
    discord.searchMessages({ channel_id: [CHANNEL_ID] })
  ).rejects.toBeInstanceOf(DiscordError)
})

test("a page holds 25 lines and leads to the older ones by the ID of its last, which the older page continues from without repeating or skipping one", async () => {
  const lines = Array.from({ length: 26 }, (_, index) =>
    gameLogLine(
      new Date(Date.UTC(2026, 10, 3, 8, index)).toISOString(),
      index.toString(16).padStart(8, "0")
    )
  )
  const discord = discordWith(lines)

  const first = await readGameLog(discord, CONFIG, {})
  const oldest = first.days.at(-1)?.entries.at(-1)
  const second = await readGameLog(discord, CONFIG, {
    before: first.older ?? undefined,
  })

  expect(hashesOf(first)).toHaveLength(25)
  expect(first.before).toBeNull()
  expect(first.older).toBe(oldest?.messageId)
  expect(hashesOf(second)).toEqual(["00000000"])
  expect(second.before).toBe(first.older)
  expect(second.older).toBeNull()
  expect([...hashesOf(first), ...hashesOf(second)]).toEqual(
    lines.map((_, index) => index.toString(16).padStart(8, "0")).toReversed()
  )
})

test("a page of exactly 25 lines leads nowhere older", async () => {
  const discord = discordWith(
    Array.from({ length: 25 }, (_, index) =>
      gameLogLine(
        new Date(Date.UTC(2026, 10, 3, 8, index)).toISOString(),
        index.toString(16).padStart(8, "0")
      )
    )
  )

  expect((await readGameLog(discord, CONFIG, {})).older).toBeNull()
})

test("a cursor that is no snowflake counts as absent", async () => {
  const discord = discordWith([gameLogLine("2026-11-03T08:00:00Z", "11111111")])

  const page = await readGameLog(discord, CONFIG, { before: "hier" })

  expect(page.before).toBeNull()
  expect(hashesOf(page)).toEqual(["11111111"])
})

test("a channel with no line gives no day", async () => {
  const page = await readGameLog(discordWith([]), CONFIG, {})

  expect(page.days).toEqual([])
  expect(page.older).toBeNull()
})

test("a search that fails is thrown, not turned into an empty log", async () => {
  const discord = discordWith([gameLogLine("2026-11-03T08:00:00Z", "11111111")])
  discord.failNext(
    "searchMessages",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildMessagesSearch,
      status: 503,
    })
  )

  await expect(readGameLog(discord, CONFIG, {})).rejects.toBeInstanceOf(
    DiscordError
  )
})

test("a line that has a reason carries it", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-03T08:00:00Z", "11111111", { reason: "Test" }),
  ])

  const [entry] =
    (await readGameLog(discord, CONFIG, {})).days[0]?.entries ?? []

  expect(entry).toMatchObject({ kind: "event", reason: "Test" })
})
