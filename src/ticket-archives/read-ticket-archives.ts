import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { MAX_SEARCHES } from "@/discord/message-search-limits"
import { accountNames } from "@/records/account-names"
import {
  ARCHIVES_PER_PAGE,
  searchTicketArchives,
} from "./search-ticket-archives"
import type { TicketArchive } from "./ticket-archive"

export const MAX_CITING_ARCHIVES_READ = MAX_SEARCHES * ARCHIVES_PER_PAGE

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
  const opened = new Map<Snowflake, TicketArchive>()
  let citing = 0
  for (let page = 0; page < MAX_SEARCHES; page++) {
    const offset = page * ARCHIVES_PER_PAGE
    const found = await searchTicketArchives(
      discord,
      archivesChannelId,
      applicationId,
      offset,
      { text: account.id }
    )
    citing = found.total
    for (const archive of found.archives) {
      if (archive.openerId === account.id) {
        opened.set(archive.messageId, archive)
      }
    }
    if (offset + ARCHIVES_PER_PAGE >= citing) {
      break
    }
  }
  const archives = [...opened.values()]
  const names = await accountNames(
    discord,
    archives.map(({ closerId }) => closerId)
  )
  return {
    kind: "read",
    complete: citing <= MAX_CITING_ARCHIVES_READ,
    archives: archives.map(({ closerId, ...archive }) => ({
      ...archive,
      closer: { id: closerId, name: names.get(closerId) ?? null },
    })),
  }
}
