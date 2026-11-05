import { RESTJSONErrorCodes } from "discord-api-types/v10"
import { expect, test } from "vitest"

import type { MessageSearchQuery } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { archiveMessage } from "./archive-message"
import { readKindCounts } from "./read-kind-counts"
import { readTicketArchivePage } from "./read-ticket-archive-page"
import type { TicketArchiveSearchParams } from "./ticket-archive-filters"
import type { KindCountsSource } from "./ticket-archive-page"

const CHANNEL_ID = "1562505523490848881"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const KINDS = {
  technical: "🔧 Problème technique",
  report: "🚨 Signaler un joueur",
  rp: "🎭 Demande RP",
  other: "❓ Autre demande",
}

function archives(kind: string, count: number, overrides = {}) {
  return Array.from({ length: count }, (_, index) =>
    archiveMessage({
      channelId: CHANNEL_ID,
      openerId: ALDIS.id,
      reason: `${kind} ${index}`,
      kind,
      ...overrides,
    })
  )
}

function serverWith(...messages: FakeChannelMessage[][]) {
  return new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: messages.flat(),
  })
}

async function sourceOf(
  discord: FakeDiscord,
  searchParams: TicketArchiveSearchParams = {}
) {
  const read = await readTicketArchivePage(discord, CHANNEL_ID, searchParams)
  if (read.kind !== "page") {
    throw new Error("The archives are not configured.")
  }
  return read.kindCounts
}

class FailingCounts extends FakeDiscord {
  constructor(
    private readonly failure: Error,
    ...rest: ConstructorParameters<typeof FakeDiscord>
  ) {
    super(...rest)
  }

  override searchMessages(query: MessageSearchQuery) {
    return query.limit === 1
      ? Promise.reject(this.failure)
      : super.searchMessages(query)
  }
}

const UNAVAILABLE = new DiscordError({
  method: "GET",
  route: "/guilds/{guild.id}/messages/search",
  status: 429,
  code: RESTJSONErrorCodes.MissingAccess,
  discordMessage: "You are being rate limited.",
  retryAfter: 4.4,
})

test("each kind counts the archives of that kind, whatever the other kinds and the archives of no kind", async () => {
  const discord = serverWith(
    archives(KINDS.technical, 3),
    archives(KINDS.report, 2),
    archives(KINDS.rp, 1),
    archives("Inconnu", 4)
  )

  expect(await readKindCounts(discord, await sourceOf(discord))).toEqual({
    "technical-issue": 3,
    "player-report": 2,
    "rp-request": 1,
    "other-request": 0,
  })
})

test("the kind counts keep to the period asked for, by the day an archive was sent", async () => {
  const discord = serverWith(
    archives(KINDS.technical, 2, { sentAt: new Date("2026-10-01T10:00:00Z") }),
    archives(KINDS.technical, 3, { sentAt: new Date("2026-10-20T10:00:00Z") }),
    archives(KINDS.report, 1, { sentAt: new Date("2026-10-21T10:00:00Z") })
  )

  const counts = await readKindCounts(
    discord,
    await sourceOf(discord, { from: "2026-10-10", to: "2026-10-31" })
  )

  expect(counts).toMatchObject({ "technical-issue": 3, "player-report": 1 })
})

test("under a kind, that kind's count is the total already read, and the others are searched", async () => {
  const discord = serverWith(
    archives(KINDS.technical, 2),
    archives(KINDS.rp, 5)
  )
  const source = await sourceOf(discord, { kind: "technical-issue" })
  if (source.kind !== "to-search") {
    throw new Error("The counts are to be searched.")
  }

  const counts = await readKindCounts(discord, {
    ...source,
    chosen: { key: "technical-issue", total: 99 },
  })

  expect(counts).toEqual({
    "technical-issue": 99,
    "player-report": 0,
    "rp-request": 5,
    "other-request": 0,
  })
})

test("counts known from a window are given as they are, with no search", async () => {
  const source: KindCountsSource = {
    kind: "known",
    counts: {
      "technical-issue": 1,
      "player-report": 2,
      "rp-request": 3,
      "other-request": 4,
    },
  }

  expect(await readKindCounts(new FakeDiscord(), source)).toEqual(source.counts)
})

test("Discord unavailable gives no counts rather than failing the page", async () => {
  const discord = new FailingCounts(UNAVAILABLE, {
    channels: [CHANNEL_ID],
    channelMessages: archives(KINDS.technical, 2),
  })

  expect(await readKindCounts(discord, await sourceOf(discord))).toBeNull()
})

test("an error that is not Discord's is thrown", async () => {
  const bug = new Error("a bug of the panel")
  const discord = new FailingCounts(bug, {
    channels: [CHANNEL_ID],
    channelMessages: archives(KINDS.technical, 2),
  })

  await expect(readKindCounts(discord, await sourceOf(discord))).rejects.toBe(
    bug
  )
})
