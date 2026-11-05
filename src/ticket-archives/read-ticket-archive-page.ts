import "server-only"

import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import { accountNames } from "./account-names"
import {
  ARCHIVES_PER_PAGE,
  searchTicketArchives,
} from "./search-ticket-archives"
import type { TicketArchive } from "./ticket-archive"

const MAX_SEARCH_OFFSET = 9975

export const MAX_PAGE = MAX_SEARCH_OFFSET / ARCHIVES_PER_PAGE + 1

export const MAX_ARCHIVES_READ = MAX_PAGE * ARCHIVES_PER_PAGE

type ArchiveAccount = { id: Snowflake; name: string | null }

export type PagedTicketArchive = Omit<
  TicketArchive,
  "openerId" | "closerId"
> & {
  opener: ArchiveAccount
  closer: ArchiveAccount
}

export type ArchivesPage = {
  kind: "page"
  archives: PagedTicketArchive[]
  page: number
  pages: number
  first: number
  last: number
  total: number
  complete: boolean
}

export type TicketArchivePage = { kind: "unconfigured" } | ArchivesPage

const PAGE = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(MAX_PAGE))
  .optional()
  .catch(undefined)

export async function readTicketArchivePage(
  discord: DiscordApi,
  archivesChannelId: Snowflake | null,
  requestedPage: unknown
): Promise<TicketArchivePage> {
  if (archivesChannelId === null) {
    return { kind: "unconfigured" }
  }
  const { id: applicationId } = await discord.getApplicationUser()
  const search = (page: number) =>
    searchTicketArchives(
      discord,
      archivesChannelId,
      applicationId,
      (page - 1) * ARCHIVES_PER_PAGE
    )
  const requested = PAGE.parse(requestedPage) ?? 1
  let page = requested
  let found = await search(page)
  const pages = Math.min(
    MAX_PAGE,
    Math.max(1, Math.ceil(found.total / ARCHIVES_PER_PAGE))
  )
  if (requested > pages) {
    page = 1
    found = await search(page)
  }
  const names = await accountNames(
    discord,
    found.archives.flatMap(({ openerId, closerId }) => [openerId, closerId])
  )
  const offset = (page - 1) * ARCHIVES_PER_PAGE
  return {
    kind: "page",
    archives: found.archives.map(({ openerId, closerId, ...archive }) => ({
      ...archive,
      opener: { id: openerId, name: names.get(openerId) ?? null },
      closer: { id: closerId, name: names.get(closerId) ?? null },
    })),
    page,
    pages,
    first: found.messages === 0 ? 0 : offset + 1,
    last: offset + found.messages,
    total: found.total,
    complete: found.total <= MAX_ARCHIVES_READ,
  }
}
