import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { memberName, userName } from "@/discord/member-name"
import {
  MAX_PAGES,
  PAGE_SIZE,
  ticketArchiveOf,
  type TicketArchive,
} from "./ticket-archive"

export type ReadTicketArchive = Omit<TicketArchive, "closerId"> & {
  closer: { id: Snowflake; name: string | null }
}

export type TicketArchives =
  | { kind: "unconfigured" }
  | { kind: "read"; archives: ReadTicketArchive[]; complete: boolean }

export async function readTicketArchives(
  discord: DiscordApi,
  archivesChannelId: Snowflake | null,
  account: { id: Snowflake } | null
): Promise<TicketArchives | null> {
  if (account === null) {
    return null
  }
  if (archivesChannelId === null) {
    return { kind: "unconfigured" }
  }
  const { id: applicationId } = await discord.getApplicationUser()
  const archives: TicketArchive[] = []
  let before: Snowflake | undefined
  let complete = false
  for (let page = 0; page < MAX_PAGES && !complete; page++) {
    const messages = await discord.listMessages(archivesChannelId, {
      ...(before === undefined ? {} : { before }),
      limit: PAGE_SIZE,
    })
    for (const { id, author, embeds } of messages) {
      const archive =
        author.id === applicationId ? ticketArchiveOf(id, embeds) : null
      if (archive !== null && archive.openerId === account.id) {
        archives.push(archive)
      }
    }
    complete = messages.length < PAGE_SIZE
    before = messages.at(-1)?.id
  }
  const names = await closerNames(discord, archives)
  return {
    kind: "read",
    complete,
    archives: archives.map(({ closerId, ...archive }) => ({
      ...archive,
      closer: { id: closerId, name: names.get(closerId) ?? null },
    })),
  }
}

async function closerNames(discord: DiscordApi, archives: TicketArchive[]) {
  const ids = new Set(archives.map(({ closerId }) => closerId))
  const names = new Map<Snowflake, string | null>()
  await Promise.all(
    [...ids].map(async (id) => {
      const member = await discord.getMember(id)
      if (member !== null) {
        names.set(id, memberName(member))
        return
      }
      const user = await discord.getUser(id)
      names.set(id, user === null ? null : userName(user))
    })
  )
  return names
}
