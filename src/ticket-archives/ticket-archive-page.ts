import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import type { PeriodBounds } from "@/discord/period-bounds"
import { accountNames } from "./account-names"
import type { RequestKindKey } from "./request-kinds"
import { ARCHIVES_PER_PAGE } from "./search-ticket-archives"
import type { TicketArchive } from "./ticket-archive"
import type { TicketArchiveFilters } from "./ticket-archive-filters"

const MAX_SEARCH_OFFSET = 9975

export const WINDOW_SEARCHES = 4

export const MAX_PAGE = MAX_SEARCH_OFFSET / ARCHIVES_PER_PAGE + 1

export const MAX_ARCHIVES_READ = MAX_PAGE * ARCHIVES_PER_PAGE

export const WINDOW_SIZE = WINDOW_SEARCHES * ARCHIVES_PER_PAGE

type ArchiveAccount = { id: Snowflake; name: string | null }

export type PagedTicketArchive = Omit<
  TicketArchive,
  "openerId" | "closerId"
> & {
  opener: ArchiveAccount
  closer: ArchiveAccount
}

export type KindCounts = Record<RequestKindKey, number>

export type KindCountsSource =
  | { kind: "known"; counts: KindCounts }
  | {
      kind: "to-search"
      archivesChannelId: Snowflake
      applicationId: Snowflake
      period: PeriodBounds
      chosen: { key: RequestKindKey; total: number } | null
    }

export type AccountNotice = {
  filter: "opener" | "closer"
  text: string
  kind: "none" | "several"
}

export type ArchivesPage = {
  kind: "page"
  filters: TicketArchiveFilters
  archives: PagedTicketArchive[]
  page: number
  pages: number
  first: number
  last: number
  total: number
  complete: boolean
  limit: "offset" | "window"
  kindCounts: KindCountsSource
  accountNotice: AccountNotice | null
}

export type TicketArchivePage = { kind: "unconfigured" } | ArchivesPage

export type ReadContext = {
  discord: DiscordApi
  archivesChannelId: Snowflake
  applicationId: Snowflake
  filters: TicketArchiveFilters
  requested: number
}

export async function pagedArchives(
  discord: DiscordApi,
  archives: readonly TicketArchive[]
): Promise<PagedTicketArchive[]> {
  const names = await accountNames(
    discord,
    archives.flatMap(({ openerId, closerId }) => [openerId, closerId])
  )
  return archives.map(({ openerId, closerId, ...archive }) => ({
    ...archive,
    opener: { id: openerId, name: names.get(openerId) ?? null },
    closer: { id: closerId, name: names.get(closerId) ?? null },
  }))
}
