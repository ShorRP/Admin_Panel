import "server-only"

import {
  ChannelType,
  RESTJSONErrorCodes,
  type Snowflake,
} from "discord-api-types/v10"

import { compareIds } from "@/discord/compare-ids"
import type {
  ChannelMessage,
  DiscordApi,
  GuildChannel,
} from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { memberName, userName } from "@/discord/member-name"
import { snowflakeDate } from "@/discord/snowflake-date"
import { viewsChannel } from "@/staff/can-view-channel"
import type { StaffMember } from "@/staff/staff-member"
import { mapWithConcurrency } from "./map-with-concurrency"
import { messageExtract } from "./message-extract"
import { requestKindOf } from "./request-kind"
import { openerIdOf } from "./ticket-opener"

const MESSAGES_PER_TICKET = 100

const MAX_CONCURRENT_CALLS = 5

type TicketPerson = { id: Snowflake; name: string }

export type OpenSupportTicket = {
  channelId: Snowflake
  url: string
  requestKind: string
  opener: TicketPerson
  openedAt: Date
  lastActivityAt: Date
  messageCount: number
  moreMessages: boolean
  repliers: TicketPerson[]
  lastMessage: { author: TicketPerson; byBot: boolean; text: string } | null
}

export type OpenSupportTickets =
  { kind: "unconfigured" } | { kind: "read"; tickets: OpenSupportTicket[] }

type TicketChannel = {
  channel: GuildChannel
  requestKind: string
  openerId: Snowflake
}

type ReadTicket = TicketChannel & { messages: ChannelMessage[] }

type Person = { name: string; staff: boolean }

export async function readOpenSupportTickets(
  discord: DiscordApi,
  staffMember: StaffMember,
  categoryId: Snowflake | null
): Promise<OpenSupportTickets> {
  if (categoryId === null) {
    return { kind: "unconfigured" }
  }
  const [guild, channels] = await Promise.all([
    discord.getGuild(),
    discord.listChannels(),
  ])
  const ticketChannels = channels
    .flatMap((channel): TicketChannel[] => {
      const requestKind = requestKindOf(channel.name)
      const openerId = openerIdOf(channel.permission_overwrites)
      return channel.type === ChannelType.GuildText &&
        channel.parent_id === categoryId &&
        requestKind !== null &&
        openerId !== null &&
        viewsChannel(guild, channel, staffMember)
        ? [{ channel, requestKind, openerId }]
        : []
    })
    .toSorted((left, right) => compareIds(left.channel.id, right.channel.id))
  const read = (
    await mapWithConcurrency(ticketChannels, MAX_CONCURRENT_CALLS, (ticket) =>
      readMessages(discord, ticket)
    )
  ).filter((ticket) => ticket !== null)
  const people = await lookUpPeople(
    discord,
    staffMember.staffRoleId,
    peopleToLookUp(read)
  )
  const names = {
    users: new Map(
      [...people].map(([id, { name }]): [string, string] => [id, name])
    ),
    roles: new Map(guild.roles.map(({ id, name }) => [id, name])),
    channels: new Map(channels.map(({ id, name }) => [id, name])),
  }
  const person = (id: Snowflake): TicketPerson => ({
    id,
    name: people.get(id)?.name ?? id,
  })
  return {
    kind: "read",
    tickets: read.map(({ channel, requestKind, openerId, messages }) => {
      const last = messages[0]
      const authorIds = repliersOf(messages, openerId)
      return {
        channelId: channel.id,
        url: `https://discord.com/channels/${discord.guildId}/${channel.id}`,
        requestKind,
        opener: person(openerId),
        openedAt: snowflakeDate(channel.id),
        lastActivityAt: snowflakeDate(last?.id ?? channel.id),
        messageCount: messages.length,
        moreMessages: messages.length === MESSAGES_PER_TICKET,
        repliers: authorIds
          .filter((id) => people.get(id)?.staff === true)
          .map(person),
        lastMessage:
          last === undefined
            ? null
            : {
                author:
                  last.author.bot === true
                    ? { id: last.author.id, name: userName(last.author) }
                    : person(last.author.id),
                byBot: last.author.bot === true,
                text: messageExtract(last, names),
              },
      }
    }),
  }
}

async function readMessages(
  discord: DiscordApi,
  ticket: TicketChannel
): Promise<ReadTicket | null> {
  try {
    return {
      ...ticket,
      messages: await discord.listMessages(ticket.channel.id, {
        limit: MESSAGES_PER_TICKET,
      }),
    }
  } catch (error) {
    if (
      error instanceof DiscordError &&
      error.code === RESTJSONErrorCodes.UnknownChannel
    ) {
      return null
    }
    throw error
  }
}

function repliersOf(messages: ChannelMessage[], openerId: Snowflake) {
  const ids = new Set<Snowflake>()
  for (const { author } of messages.toReversed()) {
    if (author.bot !== true && author.id !== openerId) {
      ids.add(author.id)
    }
  }
  return [...ids]
}

function peopleToLookUp(tickets: ReadTicket[]) {
  const fallbackNames = new Map<Snowflake, string | null>()
  for (const { openerId, messages } of tickets) {
    fallbackNames.set(openerId, fallbackNames.get(openerId) ?? null)
    for (const { author } of messages) {
      if (author.bot !== true) {
        fallbackNames.set(author.id, userName(author))
      }
    }
  }
  return fallbackNames
}

async function lookUpPeople(
  discord: DiscordApi,
  staffRoleId: Snowflake,
  fallbackNames: ReadonlyMap<Snowflake, string | null>
) {
  const people = new Map<Snowflake, Person>()
  await mapWithConcurrency(
    [...fallbackNames],
    MAX_CONCURRENT_CALLS,
    async ([id, fallbackName]) => {
      const member = await discord.getMember(id)
      if (member !== null) {
        people.set(id, {
          name: memberName(member),
          staff: member.roles.includes(staffRoleId),
        })
        return
      }
      const name =
        fallbackName ??
        (await discord.getUser(id).then((user) => user && userName(user))) ??
        id
      people.set(id, { name, staff: false })
    }
  )
  return people
}
