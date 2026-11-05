import { expect, test } from "vitest"

import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { archiveMessage } from "./archive-message"
import { readTicketArchivePage } from "./read-ticket-archive-page"
import type { TicketArchiveSearchParams } from "./ticket-archive-filters"

const CHANNEL_ID = "1562505523490848881"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const TECHNICAL = "🔧 Problème technique"

const REPORT = "🚨 Signaler un joueur"

function archive(reason: string, overrides = {}): FakeChannelMessage {
  return archiveMessage({
    channelId: CHANNEL_ID,
    openerId: ALDIS.id,
    closerId: ALDIS.id,
    reason,
    ...overrides,
  })
}

async function pageOf(
  messages: FakeChannelMessage[],
  searchParams: TicketArchiveSearchParams = {}
) {
  const read = await readTicketArchivePage(
    new FakeDiscord({
      members: [{ user: ALDIS }],
      channels: [CHANNEL_ID],
      channelMessages: messages,
    }),
    CHANNEL_ID,
    searchParams
  )
  if (read.kind !== "page") {
    throw new Error("The archives are not configured.")
  }
  return read
}

function reasonsOf({ archives }: { archives: { reason: string }[] }) {
  return archives.map(({ reason }) => reason)
}

const ofKinds = (technical: number, reports: number) =>
  Array.from({ length: technical + reports }, (_, index) =>
    index % 2 === 0 && index / 2 < technical
      ? archive(`Technique ${index}`, { kind: TECHNICAL })
      : archive(`Joueur ${index}`, { kind: REPORT })
  )

test("a kind keeps the archives of that kind, which Discord pages and counts: its total is the kind's count", async () => {
  const messages = [
    ...Array.from({ length: 30 }, (_, index) =>
      archive(`Technique ${index}`, { kind: TECHNICAL })
    ),
    ...Array.from({ length: 12 }, (_, index) =>
      archive(`Joueur ${index}`, { kind: REPORT })
    ),
    archive("Sans type", { kind: null }),
  ]

  const first = await pageOf(messages, { kind: "technical-issue" })
  const second = await pageOf(messages, {
    kind: "technical-issue",
    page: "2",
  })

  expect(reasonsOf(first)).toEqual(
    Array.from({ length: 25 }, (_, index) => `Technique ${29 - index}`)
  )
  expect(reasonsOf(second)).toEqual(
    Array.from({ length: 5 }, (_, index) => `Technique ${4 - index}`)
  )
  expect(first).toMatchObject({ pages: 2, total: 30, first: 1, last: 25 })
  expect(second).toMatchObject({ page: 2, first: 26, last: 30 })
  expect(first.kindCounts).toMatchObject({
    chosen: { key: "technical-issue", total: 30 },
  })
})

test("an archive of another kind that holds the kind's emoji in its reason is left out of the page, and counted in the total, which is Discord's", async () => {
  const read = await pageOf(
    [
      archive("Vrai problème", { kind: TECHNICAL }),
      archive("Voir le 🔧 de la semaine dernière", { kind: REPORT }),
    ],
    { kind: "technical-issue" }
  )

  expect(reasonsOf(read)).toEqual(["Vrai problème"])
  expect(read).toMatchObject({ total: 2, first: 1, last: 2 })
})

test("a kind that no archive has is an empty page", async () => {
  const read = await pageOf(ofKinds(3, 0), { kind: "rp-request" })

  expect(read).toMatchObject({ archives: [], total: 0, pages: 1, first: 0 })
})

test("a page past the last of a kind reads its first page", async () => {
  const read = await pageOf(ofKinds(10, 10), {
    kind: "player-report",
    page: "3",
  })

  expect(read).toMatchObject({ page: 1, pages: 1 })
  expect(reasonsOf(read)).toHaveLength(10)
})

const SENT = {
  beforeStart: new Date("2026-10-04T21:59:59.999Z"),
  atStart: new Date("2026-10-04T22:00:00.000Z"),
  inside: new Date("2026-10-15T12:00:00.000Z"),
  beforeEnd: new Date("2026-10-31T22:59:59.999Z"),
  atEnd: new Date("2026-10-31T23:00:00.000Z"),
}

const SENT_ARCHIVES = () => [
  archive("Avant", { sentAt: SENT.beforeStart }),
  archive("Début", { sentAt: SENT.atStart }),
  archive("Milieu", { sentAt: SENT.inside }),
  archive("Fin", { sentAt: SENT.beforeEnd }),
  archive("Après", { sentAt: SENT.atEnd }),
]

test("a period on closing keeps the archives sent from the first millisecond of its first Paris day to the last of its last", async () => {
  const read = await pageOf(SENT_ARCHIVES(), {
    from: "2026-10-05",
    to: "2026-10-31",
  })

  expect(reasonsOf(read)).toEqual(["Fin", "Milieu", "Début"])
  expect(read).toMatchObject({ total: 3, pages: 1 })
})

test("a period with only its start, or only its end, is bounded on that side alone", async () => {
  expect(
    reasonsOf(await pageOf(SENT_ARCHIVES(), { from: "2026-10-31" }))
  ).toEqual(["Après", "Fin"])
  expect(
    reasonsOf(await pageOf(SENT_ARCHIVES(), { to: "2026-10-04" }))
  ).toEqual(["Avant"])
})

test("a period of one day is that Paris day, from midnight to midnight", async () => {
  const read = await pageOf(SENT_ARCHIVES(), {
    from: "2026-10-05",
    to: "2026-10-05",
  })

  expect(reasonsOf(read)).toEqual(["Début"])
})

test("a period that ends before it starts finds nothing", async () => {
  const read = await pageOf(SENT_ARCHIVES(), {
    from: "2026-10-31",
    to: "2026-10-05",
  })

  expect(read).toMatchObject({ archives: [], total: 0 })
})

test("the oldest archives come first when asked, page after page", async () => {
  const messages = Array.from({ length: 30 }, (_, index) =>
    archive(`Archive ${index}`)
  )

  const first = await pageOf(messages, { sort: "oldest" })
  const second = await pageOf(messages, { sort: "oldest", page: "2" })

  expect(reasonsOf(first)).toEqual(
    Array.from({ length: 25 }, (_, index) => `Archive ${index}`)
  )
  expect(reasonsOf(second)).toEqual(
    Array.from({ length: 5 }, (_, index) => `Archive ${25 + index}`)
  )
})

test("a kind, a period and the oldest first combine", async () => {
  const read = await pageOf(
    [
      archive("Technique tard", { kind: TECHNICAL, sentAt: SENT.beforeEnd }),
      archive("Technique tôt", { kind: TECHNICAL, sentAt: SENT.atStart }),
      archive("Joueur", { kind: REPORT, sentAt: SENT.inside }),
      archive("Technique hors période", {
        kind: TECHNICAL,
        sentAt: SENT.atEnd,
      }),
    ],
    {
      kind: "technical-issue",
      from: "2026-10-05",
      to: "2026-10-31",
      sort: "oldest",
    }
  )

  expect(reasonsOf(read)).toEqual(["Technique tôt", "Technique tard"])
})

test("a filter that is not valid is read as absent", async () => {
  const read = await pageOf(ofKinds(3, 3), {
    kind: "nope",
    from: "2026-02-30",
    sort: "newest",
  })

  expect(read).toMatchObject({ total: 6 })
  expect(read.filters).toEqual({
    kind: null,
    opener: null,
    closer: null,
    reason: null,
    from: null,
    to: null,
    on: null,
    sort: null,
  })
})
