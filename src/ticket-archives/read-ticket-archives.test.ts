import { RESTJSONErrorCodes, type APIEmbed } from "discord-api-types/v10"
import { expect, test } from "vitest"

import type { MessageSearchQuery } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeChannelMessage } from "@/discord/fake-discord"
import { archiveEmbed, archiveMessage } from "./archive-message"
import { readTicketArchives } from "./read-ticket-archives"

const CHANNEL_ID = "1562505523490848881"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = {
  id: "1400000000000000002",
  username: "brynja",
  global_name: "Brynja",
}

const CORVUS = { id: "1400000000000000003", username: "corvus" }

const LYRA = { id: "1400000000000000004", username: "lyra_gates" }

const MISSING_ACCESS = new DiscordError({
  method: "GET",
  route: "/guilds/{guild.id}/messages/search",
  status: 403,
  code: RESTJSONErrorCodes.MissingAccess,
  discordMessage: "Missing Access",
})

const RATE_LIMITED = new DiscordError({
  method: "GET",
  route: "/guilds/{guild.id}/messages/search",
  status: 429,
  retryAfter: 4.4,
  discordMessage: "You are being rate limited.",
})

class ArchiveClosedBetweenSearches extends FakeDiscord {
  private closed = false

  override async searchMessages(query: MessageSearchQuery) {
    const found = await super.searchMessages(query)
    if (!this.closed) {
      this.closed = true
      await this.createMessage(CHANNEL_ID, {
        embeds: [archiveEmbed({ openerId: ALDIS.id, reason: "Fermée entre" })],
      })
    }
    return found
  }
}

function opened(openerId: string, overrides = {}): FakeChannelMessage {
  return archiveMessage({ channelId: CHANNEL_ID, openerId, ...overrides })
}

function archivesOf(discord: FakeDiscord, account = ALDIS) {
  return readTicketArchives(discord, CHANNEL_ID, account)
}

function embedWith(changes: Partial<APIEmbed>): FakeChannelMessage {
  return {
    channelId: CHANNEL_ID,
    embeds: [{ ...archiveEmbed({ openerId: ALDIS.id }), ...changes }],
  }
}

function withoutField(name: string): FakeChannelMessage {
  const embed = archiveEmbed({ openerId: ALDIS.id })
  return {
    channelId: CHANNEL_ID,
    embeds: [
      {
        ...embed,
        fields: embed.fields?.filter((field) => field.name !== name),
      },
    ],
  }
}

function withField(name: string, value: string): FakeChannelMessage {
  const embed = archiveEmbed({ openerId: ALDIS.id })
  return {
    channelId: CHANNEL_ID,
    embeds: [
      {
        ...embed,
        fields: embed.fields?.map((field) =>
          field.name === name ? { ...field, value } : field
        ),
      },
    ],
  }
}

test("an account's archives are the support tickets it opened, newest first, each with its request kind, its dates, who closed it and why", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS }, { user: BRYNJA }],
    channels: [CHANNEL_ID],
    channelMessages: [
      opened(ALDIS.id, {
        kind: "🔧 Problème technique",
        openedAt: new Date("2026-11-01T09:00:00Z"),
        closedAt: new Date("2026-11-01T09:30:00Z"),
        closerId: ALDIS.id,
        reason: "Résolu",
      }),
      opened(ALDIS.id, {
        kind: "🚨 Signaler un joueur",
        openedAt: new Date("2026-11-03T14:32:10Z"),
        closedAt: new Date("2026-11-03T15:10:59Z"),
        closerId: BRYNJA.id,
        reason: "Signalement traité, joueur averti",
      }),
    ],
  })

  const archives = await archivesOf(discord)

  expect(archives).toMatchObject({
    kind: "read",
    complete: true,
    archives: [
      {
        requestKind: "🚨 Signaler un joueur",
        openedAt: new Date("2026-11-03T14:32:10Z"),
        closedAt: new Date("2026-11-03T15:10:59Z"),
        closer: { id: BRYNJA.id, name: "Brynja" },
        reason: "Signalement traité, joueur averti",
      },
      {
        requestKind: "🔧 Problème technique",
        openedAt: new Date("2026-11-01T09:00:00Z"),
        closedAt: new Date("2026-11-01T09:30:00Z"),
        closer: { id: ALDIS.id, name: "aldis" },
        reason: "Résolu",
      },
    ],
  })
})

test("an account's archives leave out the tickets that other accounts opened", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [
      opened(CORVUS.id, { reason: "Pour Corvus" }),
      opened(ALDIS.id, { reason: "Pour Aldis" }),
      opened(LYRA.id, { reason: "Pour Lyra" }),
    ],
  })

  const archives = await archivesOf(discord)

  expect(
    archives?.kind === "read" && archives.archives.map(({ reason }) => reason)
  ).toEqual(["Pour Aldis"])
})

test("a message is an archive only if the application posted it: another author's look-alike is left out", async () => {
  const discord = new FakeDiscord({
    members: [{ user: LYRA }],
    channels: [CHANNEL_ID],
    channelMessages: [
      opened(ALDIS.id, { authorId: LYRA.id, reason: "Forgée par un membre" }),
      opened(ALDIS.id, { reason: "Postée par l’application" }),
    ],
  })

  const archives = await archivesOf(discord)

  expect(
    archives?.kind === "read" && archives.archives.map(({ reason }) => reason)
  ).toEqual(["Postée par l’application"])
})

test("a message of the application that is no archive, a text or an embed with another title, is left out", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [
      { channelId: CHANNEL_ID, content: "Un texte" },
      embedWith({ title: "ARCHIVE D'UN TICKET" }),
      embedWith({ title: "🗄️ ARCHIVE D’UN TICKET" }),
      embedWith({ title: "🗄️ archive d'un ticket" }),
      opened(ALDIS.id, { reason: "La seule" }),
    ],
  })

  const archives = await archivesOf(discord)

  expect(
    archives?.kind === "read" && archives.archives.map(({ reason }) => reason)
  ).toEqual(["La seule"])
})

const BREACHES = [
  ["without « Ouvert par »", withoutField("Ouvert par")],
  ["without « Fermé par »", withoutField("Fermé par")],
  ["without « Type de demande »", withoutField("Type de demande")],
  ["without « Ouvert le »", withoutField("Ouvert le")],
  ["without « Fermé le »", withoutField("Fermé le")],
  ["without « Motif »", withoutField("Motif")],
  [
    "whose opener holds no ID",
    withField("Ouvert par", "<@1400000000000000001>"),
  ],
  [
    "whose closer holds no ID",
    withField("Fermé par", "<@1400000000000000002> (`brynja`)"),
  ],
  ["whose opening date is no timestamp", withField("Ouvert le", "hier")],
  [
    "whose closing date is not in the long format",
    withField("Fermé le", "<t:1762182659:R>"),
  ],
  [
    "whose opening date is beyond the dates JavaScript holds",
    withField("Ouvert le", "<t:99999999999999:F>"),
  ],
  [
    "whose closing date is a run of digits that is no number",
    withField("Fermé le", `<t:${"9".repeat(400)}:F>`),
  ],
] as const

for (const [breach, message] of BREACHES) {
  test(`an archive ${breach} does not follow the contract and is left out`, async () => {
    const discord = new FakeDiscord({
      channels: [CHANNEL_ID],
      channelMessages: [message, opened(ALDIS.id, { reason: "La seule" })],
    })

    const archives = await archivesOf(discord)

    expect(
      archives?.kind === "read" && archives.archives.map(({ reason }) => reason)
    ).toEqual(["La seule"])
  })
}

test("a request kind of « Inconnu » reads as no request kind", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [opened(ALDIS.id, { kind: null })],
  })

  const archives = await archivesOf(discord)

  expect(archives).toMatchObject({
    archives: [{ requestKind: null }],
  })
})

test("a closer is named by their nickname on the Discord server, else by their account's name, whether or not they are still a member, else by none", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS }, { user: BRYNJA, nick: "Brynja la Rousse" }],
    users: [CORVUS],
    channels: [CHANNEL_ID],
    channelMessages: [
      opened(ALDIS.id, { closerId: ALDIS.id }),
      opened(ALDIS.id, { closerId: BRYNJA.id }),
      opened(ALDIS.id, { closerId: CORVUS.id }),
      opened(ALDIS.id, { closerId: LYRA.id }),
    ],
  })

  const archives = await archivesOf(discord)

  expect(
    archives?.kind === "read" &&
      archives.archives.map(({ closer }) => closer).reverse()
  ).toEqual([
    { id: ALDIS.id, name: "aldis" },
    { id: BRYNJA.id, name: "Brynja la Rousse" },
    { id: CORVUS.id, name: "corvus" },
    { id: LYRA.id, name: null },
  ])
})

function reasonsOf(archives: Awaited<ReturnType<typeof archivesOf>>) {
  return archives?.kind === "read"
    ? archives.archives.map(({ reason }) => reason)
    : []
}

test("an account's oldest archive is found however long ago the channel posted it: no count of messages in the channel limits the read", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [
      opened(ALDIS.id, { reason: "La plus ancienne" }),
      ...Array.from({ length: 1500 }, () => opened(CORVUS.id)),
    ],
  })

  expect(await archivesOf(discord)).toMatchObject({
    complete: true,
    archives: [{ reason: "La plus ancienne" }],
  })
})

test("an account's archives are read from every page of the search, newest first, whatever their number", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: Array.from({ length: 60 }, (_, index) =>
      opened(ALDIS.id, { reason: `Archive ${index}` })
    ),
  })

  const archives = await archivesOf(discord)

  expect(archives).toMatchObject({ complete: true })
  expect(reasonsOf(archives)).toEqual(
    Array.from({ length: 60 }, (_, index) => `Archive ${59 - index}`)
  )
})

test("the archives an account closed, and those that quote its ID in their reason, are left out: only the tickets it opened are its own", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [
      opened(ALDIS.id, { closerId: LYRA.id, reason: "Ouvert par Aldis" }),
      opened(LYRA.id, { closerId: ALDIS.id, reason: "Fermé par Aldis" }),
      opened(LYRA.id, {
        closerId: LYRA.id,
        reason: `Voir aussi ${ALDIS.id}`,
      }),
      opened(LYRA.id, { closerId: LYRA.id, reason: "Sans Aldis" }),
    ],
  })

  expect(reasonsOf(await archivesOf(discord))).toEqual(["Ouvert par Aldis"])
})

const CAP = [
  { closed: 99, oldestShown: true, complete: true },
  { closed: 100, oldestShown: false, complete: false },
] as const

for (const { closed, oldestShown, complete } of CAP) {
  test(`an account cited in ${closed + 1} archives, 1 it opened long ago and ${closed} it closed, is read for the 100 newest: its ticket is ${oldestShown ? "shown" : "not shown"}, and the read is ${complete ? "complete" : "said to be incomplete"}`, async () => {
    const discord = new FakeDiscord({
      channels: [CHANNEL_ID],
      channelMessages: [
        opened(ALDIS.id, { closerId: LYRA.id, reason: "La plus ancienne" }),
        ...Array.from({ length: closed }, () =>
          opened(LYRA.id, { closerId: ALDIS.id })
        ),
      ],
    })

    expect(await archivesOf(discord)).toEqual({
      kind: "read",
      complete,
      archives: oldestShown
        ? [expect.objectContaining({ reason: "La plus ancienne" })]
        : [],
    })
  })
}

test("an archive posted between two pages of the search shifts the next page by one: it shows no archive twice", async () => {
  const discord = new ArchiveClosedBetweenSearches({
    channels: [CHANNEL_ID],
    channelMessages: Array.from({ length: 30 }, (_, index) =>
      opened(ALDIS.id, { reason: `Archive ${index}` })
    ),
  })

  const reasons = reasonsOf(await archivesOf(discord))

  expect(reasons).toHaveLength(30)
  expect(new Set(reasons).size).toBe(30)
})

test("when the mention and the plain ID of an archive disagree, the plain ID wins, for the opener and for the closer", async () => {
  const discord = new FakeDiscord({
    members: [{ user: ALDIS }, { user: BRYNJA }, { user: LYRA }],
    channels: [CHANNEL_ID],
    channelMessages: [
      {
        channelId: CHANNEL_ID,
        embeds: [
          {
            ...archiveEmbed({ openerId: ALDIS.id }),
            fields: archiveEmbed({ openerId: ALDIS.id }).fields?.map((field) =>
              field.name === "Ouvert par"
                ? { ...field, value: `<@${LYRA.id}> (\`${ALDIS.id}\`)` }
                : field.name === "Fermé par"
                  ? { ...field, value: `<@${LYRA.id}> (\`${BRYNJA.id}\`)` }
                  : field
            ),
          },
        ],
      },
    ],
  })

  expect(await archivesOf(discord, ALDIS)).toMatchObject({
    archives: [{ closer: { id: BRYNJA.id } }],
  })
  expect(await archivesOf(discord, LYRA)).toMatchObject({ archives: [] })
})

test("an account with no archive, in an archives channel with no message, has none", async () => {
  const discord = new FakeDiscord({ channels: [CHANNEL_ID] })

  expect(await archivesOf(discord)).toEqual({
    kind: "read",
    complete: true,
    archives: [],
  })
})

test("without an archives channel in the configuration, the archives are not configured, and Discord is not called", async () => {
  const discord = new FakeDiscord()
  discord.failNext("getApplicationUser", MISSING_ACCESS)

  expect(await readTicketArchives(discord, null, ALDIS)).toEqual({
    kind: "unconfigured",
  })
  await expect(discord.getApplicationUser()).rejects.toBe(MISSING_ACCESS)
})

test("without an account, there are no archives to read, and Discord is not searched", async () => {
  const discord = new FakeDiscord({ channels: [CHANNEL_ID] })
  discord.failNext("searchMessages", MISSING_ACCESS)

  expect(await readTicketArchives(discord, CHANNEL_ID, null)).toBeNull()
  await expect(
    discord.searchMessages({ channel_id: [CHANNEL_ID] })
  ).rejects.toBe(MISSING_ACCESS)
})

test("a channel the application cannot search fails the read with Discord's error", async () => {
  const discord = new FakeDiscord({ channels: [CHANNEL_ID] })
  discord.failNext("searchMessages", MISSING_ACCESS)

  await expect(archivesOf(discord)).rejects.toBe(MISSING_ACCESS)
})

test("a search that Discord rate limits beyond what the client waits for fails the read with Discord's error, which says Discord is unavailable", async () => {
  const discord = new FakeDiscord({
    channels: [CHANNEL_ID],
    channelMessages: [opened(ALDIS.id)],
  })
  discord.failNext("searchMessages", RATE_LIMITED)

  await expect(archivesOf(discord)).rejects.toMatchObject({
    status: 429,
    unavailable: true,
  })
  expect(await archivesOf(discord)).toMatchObject({
    archives: [{ requestKind: "🔧 Problème technique" }],
  })
})

test("a second page of results that Discord refuses fails the whole read: the first page's archives are not shown alone", async () => {
  class RefusingLaterPages extends FakeDiscord {
    override searchMessages(query: MessageSearchQuery) {
      return query.offset === 0
        ? super.searchMessages(query)
        : Promise.reject(RATE_LIMITED)
    }
  }
  const discord = new RefusingLaterPages({
    channels: [CHANNEL_ID],
    channelMessages: Array.from({ length: 30 }, () => opened(ALDIS.id)),
  })

  await expect(archivesOf(discord)).rejects.toBe(RATE_LIMITED)
})

test("a channel that does not exist fails the read as Missing Access, as Discord answers a search of one", async () => {
  await expect(archivesOf(new FakeDiscord())).rejects.toMatchObject({
    status: 403,
    code: RESTJSONErrorCodes.MissingAccess,
  })
})
