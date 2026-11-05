import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type RESTPostAPIAutoModerationRuleJSONBody,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { describeDiscordApiContract } from "./discord-api-contract"
import { FakeDiscord, type FakeChannel } from "./fake-discord"

const OUTSIDER = { id: "222222222222222222", username: "outsider" }

const OWNER = { id: "222222222222222223", username: "owner" }

const MEMBER = { id: "222222222222222224", username: "member" }

const ABSENT = { id: "222222222222222227", username: "absent" }

const PANEL_ROLE = { id: "333333333333333333", name: "Shor Panel", position: 1 }

const CATEGORY: FakeChannel = {
  id: "555555555555555560",
  type: ChannelType.GuildCategory,
  name: "Salons",
}

const PRIVATE_CHANNEL: FakeChannel = {
  id: "555555555555555561",
  name: "privé",
  parent_id: CATEGORY.id,
  permission_overwrites: [
    {
      id: PANEL_ROLE.id,
      type: OverwriteType.Role,
      allow: String(PermissionFlagsBits.ViewChannel),
      deny: "0",
    },
  ],
}

describeDiscordApiContract("The fake Discord", () => ({
  discord: new FakeDiscord({
    ownerId: OWNER.id,
    roles: [PANEL_ROLE],
    applicationRoles: [PANEL_ROLE.id],
    members: [{ user: OWNER }, { user: MEMBER }],
    users: [OUTSIDER, ABSENT],
    channels: [CATEGORY, PRIVATE_CHANNEL],
  }),
  outsider: OUTSIDER.id,
  member: MEMBER.id,
  absent: ABSENT.id,
  deleteMessage: () => Promise.resolve(),
  cleanUp: () => Promise.resolve(),
}))

function limitedRule(
  actions: RESTPostAPIAutoModerationRuleJSONBody["actions"],
  exemptRoles: string[]
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: "Limited rule",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["a"] },
    actions,
    exempt_roles: exemptRoles,
    enabled: false,
  }
}

function blocking(customMessage: string) {
  return {
    type: AutoModerationActionType.BlockMessage,
    metadata: { custom_message: customMessage },
  }
}

function timingOut(seconds: number) {
  return {
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: seconds },
  }
}

function roleIds(count: number) {
  return Array.from(
    { length: count },
    (_, index) => `44000000000000${String(index).padStart(4, "0")}`
  )
}

const REFUSED = {
  status: 400,
  code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
}

const LIMITS = [
  {
    limit: "a timeout of up to 2,419,200 seconds",
    within: limitedRule([timingOut(2_419_200)], []),
    beyond: limitedRule([timingOut(2_419_201)], []),
  },
  {
    limit: "up to 20 exempt roles",
    within: limitedRule([], roleIds(20)),
    beyond: limitedRule([], roleIds(21)),
  },
  {
    limit: "a custom message of up to 300 characters",
    within: limitedRule([blocking("é".repeat(300))], []),
    beyond: limitedRule([blocking("é".repeat(301))], []),
  },
]

for (const { limit, within, beyond } of LIMITS) {
  test(`the fake refuses a rule beyond ${limit}, as Discord does, when it is created and when it is modified`, async () => {
    const discord = new FakeDiscord()
    await expect(
      discord.createAutoModerationRule(beyond, "Beyond")
    ).rejects.toMatchObject(REFUSED)
    const created = await discord.createAutoModerationRule(within, "Within")

    await expect(
      discord.modifyAutoModerationRule(
        created.id,
        { actions: beyond.actions, exempt_roles: beyond.exempt_roles },
        "Beyond"
      )
    ).rejects.toMatchObject(REFUSED)

    expect(await discord.listAutoModerationRules()).toEqual([created])
  })
}

test("the fake reads a member's arrival as given, a member given none as arrived at a default date, and a member given a null one as having none", async () => {
  const discord = new FakeDiscord({
    members: [
      { user: MEMBER, joined_at: "2026-03-14T09:26:53.589000+00:00" },
      { user: OWNER },
      { user: OUTSIDER, joined_at: null },
    ],
  })

  const members = await discord.listMembers({ limit: 10 })

  expect(
    members.map(({ user, joined_at }) => [user.username, joined_at])
  ).toEqual([
    ["outsider", null],
    ["owner", "2026-01-01T00:00:00.000000+00:00"],
    ["member", "2026-03-14T09:26:53.589000+00:00"],
    ["Shor Panel", "2026-01-01T00:00:00.000000+00:00"],
  ])
})

const ARCHIVES_CHANNEL_ID = "555555555555555555"

test("the fake lists the messages a channel was given newest first, with the application as the author unless another is named, and the embeds as given", async () => {
  const embed = { title: "Archive", fields: [{ name: "Motif", value: "Test" }] }
  const discord = new FakeDiscord({
    members: [{ user: MEMBER }],
    channelMessages: [
      { channelId: ARCHIVES_CHANNEL_ID, embeds: [embed] },
      { channelId: ARCHIVES_CHANNEL_ID, authorId: MEMBER.id, content: "Salut" },
    ],
  })

  const listed = await discord.listMessages(ARCHIVES_CHANNEL_ID, { limit: 10 })

  expect(
    listed.map(({ author, content, embeds }) => [author.id, content, embeds])
  ).toEqual([
    [MEMBER.id, "Salut", []],
    [discord.applicationUser.id, "", [embed]],
  ])
})

test("the fake lists a channel it was given with no message as empty, and a channel it was not given as Unknown Channel", async () => {
  const discord = new FakeDiscord({ channels: [ARCHIVES_CHANNEL_ID] })

  expect(
    await discord.listMessages(ARCHIVES_CHANNEL_ID, { limit: 100 })
  ).toEqual([])
  await expect(
    discord.listMessages("555555555555555556", { limit: 100 })
  ).rejects.toMatchObject({
    status: 404,
    code: RESTJSONErrorCodes.UnknownChannel,
  })
})

test("the fake pages through a channel by the message before the last of the previous page, 50 messages by default", async () => {
  const discord = new FakeDiscord({
    channelMessages: Array.from({ length: 120 }, (_, index) => ({
      channelId: ARCHIVES_CHANNEL_ID,
      content: String(index),
    })),
  })

  const first = await discord.listMessages(ARCHIVES_CHANNEL_ID, {})
  const second = await discord.listMessages(ARCHIVES_CHANNEL_ID, {
    before: first.at(-1)?.id,
    limit: 100,
  })

  expect(first.map(({ content }) => content)).toEqual(
    Array.from({ length: 50 }, (_, index) => String(119 - index))
  )
  expect(second.map(({ content }) => content)).toEqual(
    Array.from({ length: 70 }, (_, index) => String(69 - index))
  )
})

function withoutMessageContent() {
  const applicationId = new FakeDiscord().applicationUser.id
  return new FakeDiscord({
    messageContentIntent: false,
    members: [{ user: MEMBER }],
    channelMessages: [
      {
        channelId: ARCHIVES_CHANNEL_ID,
        authorId: MEMBER.id,
        content: "Bonjour tout le monde",
        embeds: [{ title: "Titre du membre" }],
      },
      {
        channelId: ARCHIVES_CHANNEL_ID,
        content: "Message de l'application",
        embeds: [{ title: "Titre de l'application" }],
      },
      {
        channelId: ARCHIVES_CHANNEL_ID,
        authorId: MEMBER.id,
        content: `Salut <@${applicationId}> et <@!${applicationId}>`,
        embeds: [{ title: "Titre de la mention" }],
      },
    ],
  })
}

test("with Message Content off, the fake empties the content and the embeds of a message of another author when it lists a channel, and keeps those of the application's and of a message that mentions the application", async () => {
  const discord = withoutMessageContent()

  const listed = await discord.listMessages(ARCHIVES_CHANNEL_ID, { limit: 10 })

  expect(
    listed.map(({ author, content, embeds }) => [author.id, content, embeds])
  ).toEqual([
    [
      MEMBER.id,
      `Salut <@${discord.applicationUser.id}> et <@!${discord.applicationUser.id}>`,
      [{ title: "Titre de la mention" }],
    ],
    [
      discord.applicationUser.id,
      "Message de l'application",
      [{ title: "Titre de l'application" }],
    ],
    [MEMBER.id, "", []],
  ])
})

test("with Message Content off, the fake's search gives a message of another author without its content and its embeds, and finds it by no text", async () => {
  const discord = withoutMessageContent()

  const all = await discord.searchMessages({
    channel_id: [ARCHIVES_CHANNEL_ID],
  })

  expect(all.total_results).toBe(3)
  expect(
    all.messages.map(({ author, content, embeds }) => [
      author.id,
      content === "",
      embeds.length,
    ])
  ).toEqual([
    [MEMBER.id, false, 1],
    [discord.applicationUser.id, false, 1],
    [MEMBER.id, true, 0],
  ])
  expect(
    (await discord.searchMessages({ content: "bonjour" })).total_results
  ).toBe(0)
  expect(
    (await discord.searchMessages({ content: "titre membre" })).total_results
  ).toBe(0)
  expect(
    (await discord.searchMessages({ content: "application" })).total_results
  ).toBe(1)
})

const OTHER_CHANNEL_ID = "555555555555555570"

function searchable(...contents: string[]) {
  return new FakeDiscord({
    channels: [ARCHIVES_CHANNEL_ID, OTHER_CHANNEL_ID],
    channelMessages: contents.map((content) => ({
      channelId: ARCHIVES_CHANNEL_ID,
      content,
    })),
  })
}

async function foundContents(discord: FakeDiscord, text: string) {
  return (await discord.searchMessages({ content: text })).messages.map(
    ({ content }) => content
  )
}

test("the fake's search reads every channel it was given when none is named, and only those named otherwise, leaving out a channel it was not given when another is named", async () => {
  const discord = new FakeDiscord({
    channels: [ARCHIVES_CHANNEL_ID, OTHER_CHANNEL_ID],
    channelMessages: [
      { channelId: ARCHIVES_CHANNEL_ID, content: "dans les archives" },
      { channelId: OTHER_CHANNEL_ID, content: "dans l'autre salon" },
    ],
  })
  const dm = await discord.createDm(discord.applicationUser.id)
  await discord.createMessage(dm.id, { content: "dans un message privé" })

  const contents = async (channelIds: string[]) =>
    (await discord.searchMessages({ channel_id: channelIds })).messages.map(
      ({ content }) => content
    )

  expect(await contents([])).toEqual([
    "dans l'autre salon",
    "dans les archives",
  ])
  expect(await contents([OTHER_CHANNEL_ID])).toEqual(["dans l'autre salon"])
  expect(await contents([OTHER_CHANNEL_ID, "555555555555555599"])).toEqual([
    "dans l'autre salon",
  ])
})

test("the fake's search finds the whole words of a text in any order when they sit within 2 words of one another, in one text of a message", async () => {
  const discord = searchable(
    "un deux trois quatre cinq six",
    "un deux",
    "un x y trois"
  )

  expect(await foundContents(discord, "trois un")).toEqual([
    "un x y trois",
    "un deux trois quatre cinq six",
  ])
  expect(await foundContents(discord, "un quatre")).toEqual([
    "un deux trois quatre cinq six",
  ])
  expect(await foundContents(discord, "un cinq")).toEqual([])
  expect(await foundContents(discord, "un un")).toEqual([])
})

test("the fake's search finds the words of a text apart from the case, splits them at what is not a letter, a digit or an emoji, and keeps their accents", async () => {
  const discord = searchable("Ticket-4242 résolu 🔧", "Ticket 99")

  expect(await foundContents(discord, "TICKET 4242")).toEqual([
    "Ticket-4242 résolu 🔧",
  ])
  expect(await foundContents(discord, "résolu")).toEqual([
    "Ticket-4242 résolu 🔧",
  ])
  expect(await foundContents(discord, "resolu")).toEqual([])
  expect(await foundContents(discord, "🔧")).toEqual(["Ticket-4242 résolu 🔧"])
  expect(await foundContents(discord, "ticke")).toEqual([])
})

test("the fake's search takes a blank text for no filter, and a text with no word in it for a filter that nothing passes", async () => {
  const discord = searchable("un", "deux")

  expect(await foundContents(discord, "")).toEqual(["deux", "un"])
  expect(await foundContents(discord, "   ")).toEqual(["deux", "un"])
  expect(await foundContents(discord, "«»")).toEqual([])
})

test("the fake's search reads a message's embed one text at a time", async () => {
  const discord = new FakeDiscord({
    channelMessages: [
      {
        channelId: ARCHIVES_CHANNEL_ID,
        content: "un",
        embeds: [
          {
            title: "deux",
            description: "trois",
            fields: [{ name: "quatre", value: "cinq" }],
            footer: { text: "six" },
          },
        ],
      },
    ],
  })

  for (const text of ["un", "deux", "trois", "quatre", "cinq", "six"]) {
    expect(
      (await discord.searchMessages({ content: text })).total_results
    ).toBe(1)
  }
  expect(
    (await discord.searchMessages({ content: "un deux" })).total_results
  ).toBe(0)
  expect(
    (await discord.searchMessages({ content: "quatre cinq" })).total_results
  ).toBe(0)
})

test("with Message Content on, which is the default, the fake gives every message whole", async () => {
  const discord = new FakeDiscord({
    members: [{ user: MEMBER }],
    channelMessages: [
      {
        channelId: ARCHIVES_CHANNEL_ID,
        authorId: MEMBER.id,
        content: "Bonjour tout le monde",
        embeds: [{ title: "Titre du membre" }],
      },
    ],
  })

  const found = await discord.searchMessages({ content: "bonjour" })

  expect(found.messages.map(({ content }) => content)).toEqual([
    "Bonjour tout le monde",
  ])
  expect(
    (await discord.listMessages(ARCHIVES_CHANNEL_ID, { limit: 1 }))[0]?.embeds
  ).toEqual([{ title: "Titre du membre" }])
})

test("the application posts an embed to a channel the fake was given, and it is listed as the application's", async () => {
  const discord = new FakeDiscord({ channels: [ARCHIVES_CHANNEL_ID] })

  await discord.createMessage(ARCHIVES_CHANNEL_ID, {
    embeds: [{ title: "Archive" }],
  })

  expect(
    (await discord.listMessages(ARCHIVES_CHANNEL_ID, { limit: 1 })).map(
      ({ author, embeds }) => [author.id, embeds]
    )
  ).toEqual([[discord.applicationUser.id, [{ title: "Archive" }]]])
})

test("the fake lists a channel given by its ID alone as a text channel with no parent and no overwrite, and one given in full as it was given", async () => {
  const discord = new FakeDiscord({
    channels: [ARCHIVES_CHANNEL_ID, CATEGORY, PRIVATE_CHANNEL],
  })

  const channels = await discord.listChannels()

  expect(channels).toEqual([
    {
      id: ARCHIVES_CHANNEL_ID,
      type: ChannelType.GuildText,
      name: "channel",
      parent_id: null,
      permission_overwrites: [],
    },
    {
      id: CATEGORY.id,
      type: ChannelType.GuildCategory,
      name: "Salons",
      parent_id: null,
      permission_overwrites: [],
    },
    { ...PRIVATE_CHANNEL, type: ChannelType.GuildText },
  ])
  expect(await discord.listMessages(PRIVATE_CHANNEL.id, { limit: 1 })).toEqual(
    []
  )
})

test("a role the state gives for the Discord server's ID is the Discord server's @everyone, the only role of that ID, and with none the fake gives @everyone no permission", async () => {
  const everyone = {
    id: new FakeDiscord().guildId,
    name: "@everyone",
    permissions: String(PermissionFlagsBits.ViewChannel),
  }

  const roles = await new FakeDiscord({ roles: [everyone] }).listRoles()
  const unset = await new FakeDiscord().listRoles()

  expect(roles).toHaveLength(1)
  expect(roles[0]).toMatchObject(everyone)
  expect(unset).toHaveLength(1)
  expect(unset[0]).toMatchObject({ name: "@everyone", permissions: "0" })
})
