import { expect, test } from "vitest"

import type { MessageSearchQuery } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { MAX_SEARCHES } from "@/discord/message-search-limits"
import { ROUTES } from "@/discord/routes"
import { gameLogMessage } from "./game-log-message"
import { readGameLog, type GameLogPage } from "./read-game-log"

const CHANNEL_ID = "1568022814483685377"

const OTHER_CHANNEL_ID = "1568022878765719651"

const WEBHOOK_ID = "1568023050346307647"

const CONFIG = { channelId: CHANNEL_ID, webhookId: WEBHOOK_ID }

const FORGER_ID = "1400000000000000009"

class SpiedDiscord extends FakeDiscord {
  readonly searches: MessageSearchQuery[] = []

  override searchMessages(query: MessageSearchQuery) {
    this.searches.push(query)
    return super.searchMessages(query)
  }
}

function discordWith(messages: FakeChannelMessage[]) {
  return new SpiedDiscord({
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

test("a text with no word in it counts as absent, as the Bot log's does, since it would match every line", async () => {
  const discord = discordWith([gameLogLine("2026-11-03T08:00:00Z", "11111111")])

  const page = await readGameLog(discord, CONFIG, { text: "§§ !!" })

  expect(page.text).toBeNull()
  expect(hashesOf(page)).toEqual(["11111111"])
})

test("a text keeps the lines that hold every word typed in one of their texts, Discord being asked for the longest term", async () => {
  const discord = discordWith([
    gameLogLine("2026-11-03T08:00:00Z", "11111111", {
      character: "Merida Stormcloak",
    }),
    gameLogLine("2026-11-03T09:00:00Z", "22222222", { character: "Merida" }),
  ])

  const page = await readGameLog(discord, CONFIG, {
    text: "merida stormcloak",
  })

  expect(hashesOf(page)).toEqual(["11111111"])
  expect(discord.searches).toHaveLength(1)
  expect(discord.searches[0]?.content).toBe("stormcloak")
})

test("a text of more than 1,024 characters counts as absent", async () => {
  const discord = discordWith([gameLogLine("2026-11-03T08:00:00Z", "11111111")])

  const page = await readGameLog(discord, CONFIG, { text: "a".repeat(1025) })

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

test("a full page of 25 lines may have older ones, which Discord was not shown to count under a bound, so it leads to them and the older page then holds none", async () => {
  const discord = discordWith(
    Array.from({ length: 25 }, (_, index) =>
      gameLogLine(
        new Date(Date.UTC(2026, 10, 3, 8, index)).toISOString(),
        index.toString(16).padStart(8, "0")
      )
    )
  )

  const first = await readGameLog(discord, CONFIG, {})
  const second = await readGameLog(discord, CONFIG, {
    before: first.older ?? undefined,
  })

  expect(first.older).toBe(first.days.at(-1)?.entries.at(-1)?.messageId)
  expect(second.days).toEqual([])
  expect(second.older).toBeNull()
})

test("a page of fewer than 25 lines leads nowhere older", async () => {
  const discord = discordWith(
    Array.from({ length: 24 }, (_, index) =>
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

function minuteAt(index: number) {
  return new Date(Date.UTC(2026, 10, 3, 8, index)).toISOString()
}

const FILTERED_LINES = [
  gameLogLine(minuteAt(0), "00000001", {
    action: "administration:heal",
    character: "Merida",
    account: "2094594320",
    target: "4278190080",
    place: "3c:Skyrim.esm · 1, 2, 3",
  }),
  gameLogLine(minuteAt(1), "00000002", {
    action: "administration:workshop:create",
    character: "Lyra",
    account: "2094594321",
    target: null,
    reason: "Atelier de test",
    place: "3c:Shor-City.esp · 4, 5, 6",
  }),
  gameLogLine(minuteAt(2), "00000003", {
    category: "Personnages",
    action: "déconnexion",
    character: "Merida Stormcloak",
    account: "2094594320",
    target: null,
    place: "1a2b:Skyrim.esm · 7, 8, 9",
  }),
  {
    channelId: CHANNEL_ID,
    authorId: WEBHOOK_ID,
    sentAt: new Date(minuteAt(3)),
    embeds: [{ title: "Serveur redémarré", description: "Planifié" }],
  },
  gameLogLine(minuteAt(4), "00000005", {
    category: "Serveur",
    action: "restart",
    character: "Système",
    account: "1",
    target: null,
    place: "quelque part",
  }),
]

async function filteredHashes(searchParams: Parameters<typeof readGameLog>[2]) {
  return hashesOf(
    await readGameLog(discordWith(FILTERED_LINES), CONFIG, searchParams)
  )
}

test("a category keeps the lines of its pill, whatever the case of their title, and drops the raw ones and the other categories", async () => {
  expect(await filteredHashes({ category: "administration" })).toEqual([
    "00000002",
    "00000001",
  ])
  expect(await filteredHashes({ category: "characters" })).toEqual(["00000003"])
})

test("a category is asked of Discord by its label when no other filter can be", async () => {
  const discord = discordWith(FILTERED_LINES)

  await readGameLog(discord, CONFIG, { category: "characters" })

  expect(discord.searches).toHaveLength(1)
  expect(discord.searches[0]?.content).toBe("Personnages")
})

test("an action keeps the lines whose action holds every word typed, whole, whatever the case", async () => {
  expect(await filteredHashes({ action: "heal" })).toEqual(["00000001"])
  expect(await filteredHashes({ action: "Workshop CREATE" })).toEqual([
    "00000002",
  ])
  expect(await filteredHashes({ action: "déconnexion" })).toEqual(["00000003"])
  expect(await filteredHashes({ action: "administration" })).toEqual([
    "00000002",
    "00000001",
  ])
  expect(await filteredHashes({ action: "hea" })).toEqual([])
  expect(await filteredHashes({ action: "deconnexion" })).toEqual([])
})

test("an action is never asked of Discord, since a part of administration:heal may be no word of its index", async () => {
  const discord = discordWith(FILTERED_LINES)

  await readGameLog(discord, CONFIG, { action: "heal" })

  expect(discord.searches).toHaveLength(1)
  expect(discord.searches[0]).not.toHaveProperty("content")
})

test("a character keeps the lines whose character's name holds every word typed, whole, whatever the case, and Discord is asked for the longest term", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, { character: "merida" })

  expect(hashesOf(page)).toEqual(["00000003", "00000001"])
  expect(discord.searches[0]?.content).toBe("merida")
  expect(await filteredHashes({ character: "Merida Stormcloak" })).toEqual([
    "00000003",
  ])
  expect(await filteredHashes({ character: "mer" })).toEqual([])
})

test("a game account keeps the lines of that number alone, and Discord is asked for the number", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, { account: "2094594320" })

  expect(hashesOf(page)).toEqual(["00000003", "00000001"])
  expect(discord.searches[0]?.content).toBe("2094594320")
  expect(await filteredHashes({ account: "20945943" })).toEqual([])
  expect(await filteredHashes({ account: "2094594321" })).toEqual(["00000002"])
})

test("a target keeps the lines whose target holds every word typed, and drops the lines with none", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, { target: "4278190080" })

  expect(hashesOf(page)).toEqual(["00000001"])
  expect(discord.searches[0]?.content).toBe("4278190080")
  expect(await filteredHashes({ target: "4278190" })).toEqual([])
})

test("a cell keeps the lines whose place is in that form ID, however it is written, and Discord is not asked", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, { cell: "3c" })

  expect(hashesOf(page)).toEqual(["00000002", "00000001"])
  expect(discord.searches[0]).not.toHaveProperty("content")
  expect(await filteredHashes({ cell: "0x003C" })).toEqual([
    "00000002",
    "00000001",
  ])
  expect(await filteredHashes({ cell: "1a2b" })).toEqual(["00000003"])
  expect(await filteredHashes({ cell: "3" })).toEqual([])
})

test("a plugin keeps the lines whose place is in a plugin whose name holds the text, whatever the case, and Discord is not asked", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, { plugin: "skyrim" })

  expect(hashesOf(page)).toEqual(["00000003", "00000001"])
  expect(discord.searches[0]).not.toHaveProperty("content")
  expect(await filteredHashes({ plugin: "Shor-City" })).toEqual(["00000002"])
  expect(await filteredHashes({ plugin: "quelque" })).toEqual([])
})

test("a reason keeps the lines whose reason holds every word typed, and drops the lines with none", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, { reason: "test atelier" })

  expect(hashesOf(page)).toEqual(["00000002"])
  expect(discord.searches[0]?.content).toBe("atelier")
  expect(await filteredHashes({ reason: "heal" })).toEqual([])
})

test("the filters combine, every one of them having to hold", async () => {
  expect(
    await filteredHashes({ character: "merida", account: "2094594320" })
  ).toEqual(["00000003", "00000001"])
  expect(
    await filteredHashes({
      character: "merida",
      account: "2094594320",
      category: "administration",
      action: "heal",
      target: "4278190080",
      cell: "3c",
      plugin: "skyrim",
    })
  ).toEqual(["00000001"])
  expect(
    await filteredHashes({ character: "merida", category: "administration" })
  ).toEqual(["00000001"])
  expect(await filteredHashes({ character: "lyra", action: "heal" })).toEqual(
    []
  )
})

test("a line out of format, or of a category no pill names, matches only the text and the period", async () => {
  expect(await filteredHashes({ text: "planifié" })).toEqual([
    "raw:Serveur redémarré",
  ])
  expect(await filteredHashes({ text: "restart" })).toEqual(["00000005"])
  expect(await filteredHashes({ action: "restart" })).toEqual(["00000005"])
  expect(await filteredHashes({ character: "planifié" })).toEqual([])
  expect(await filteredHashes({ cell: "3c", plugin: "Skyrim" })).toEqual([
    "00000001",
  ])
})

test("Discord is asked for one term: the game account first, then the target, the character, the text, the reason, and last the category", async () => {
  const served = [
    ["account", "2094594320", "2094594320"],
    ["target", "4278190080", "4278190080"],
    ["character", "Merida", "Merida"],
    ["text", "stormcloak", "stormcloak"],
    ["reason", "atelier", "atelier"],
    ["category", "administration", "Administration"],
  ] as const
  const unserved = { action: "heal", cell: "3c", plugin: "skyrim" }
  const askedFor = async (searchParams: object) => {
    const discord = discordWith(FILTERED_LINES)
    await readGameLog(discord, CONFIG, searchParams)
    return discord.searches[0]?.content
  }

  for (const [index, [, , expected]] of served.entries()) {
    expect(
      await askedFor({
        ...Object.fromEntries(
          served.slice(index).map(([name, value]) => [name, value])
        ),
        ...unserved,
      })
    ).toBe(expected)
  }
  expect(await askedFor(unserved)).toBeUndefined()
})

test("a message of another author stays out under a filter, even when Discord's search lets it through", async () => {
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
      gameLogLine("2026-11-03T08:00:00Z", "11111111", { character: "Merida" }),
      {
        ...gameLogLine("2026-11-03T09:00:00Z", "22222222", {
          character: "Merida",
        }),
        authorId: FORGER_ID,
      },
    ],
  })

  expect(
    hashesOf(await readGameLog(discord, CONFIG, { character: "merida" }))
  ).toEqual(["11111111"])
})

test("a filter that Discord's search cannot serve is checked on the pages read, up to four searches, and the page says it was cut", async () => {
  const noise = Array.from({ length: MAX_SEARCHES * 25 + 5 }, (_, index) =>
    gameLogLine(
      minuteAt(index + 1),
      `f${index.toString(16).padStart(7, "0")}`,
      {
        action: "administration:fill",
      }
    )
  )
  const discord = discordWith([
    gameLogLine(minuteAt(0), "00000001", { action: "administration:heal" }),
    ...noise,
  ])

  const first = await readGameLog(discord, CONFIG, { action: "heal" })

  expect(discord.searches).toHaveLength(MAX_SEARCHES)
  expect(first.days).toEqual([])
  expect(first.cut).toBe(true)
  expect(first.older).not.toBeNull()

  const second = await readGameLog(discord, CONFIG, {
    action: "heal",
    before: first.older ?? "",
  })

  expect(hashesOf(second)).toEqual(["00000001"])
  expect(second.cut).toBe(false)
  expect(second.older).toBeNull()
})

test("a filter served by Discord reads one page, and a full page of matches leads on without being cut", async () => {
  const discord = discordWith(
    Array.from({ length: 40 }, (_, index) =>
      gameLogLine(minuteAt(index), index.toString(16).padStart(8, "0"), {
        character: "Merida",
      })
    )
  )

  const page = await readGameLog(discord, CONFIG, { character: "merida" })

  expect(hashesOf(page)).toHaveLength(25)
  expect(page.cut).toBe(false)
  expect(page.older).not.toBeNull()
  expect(discord.searches).toHaveLength(1)
})

test("a period still asks Discord nothing when it ends before it starts, whatever the filters", async () => {
  const discord = discordWith(FILTERED_LINES)

  const page = await readGameLog(discord, CONFIG, {
    character: "merida",
    from: "2026-11-04",
    to: "2026-11-03",
  })

  expect(page.days).toEqual([])
  expect(page.cut).toBe(false)
  expect(discord.searches).toEqual([])
})
