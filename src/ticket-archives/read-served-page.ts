import "server-only"

import { periodBounds } from "./period-bounds"
import { REQUEST_KINDS, requestKindKeyOf } from "./request-kinds"
import {
  ARCHIVES_PER_PAGE,
  searchTicketArchives,
} from "./search-ticket-archives"
import {
  MAX_ARCHIVES_READ,
  MAX_PAGE,
  pagedArchives,
  type ArchivesPage,
  type ReadContext,
} from "./ticket-archive-page"

export async function readServedPage({
  discord,
  archivesChannelId,
  applicationId,
  filters,
  requested,
}: ReadContext): Promise<ArchivesPage> {
  const period = periodBounds(filters)
  const search = (page: number) =>
    searchTicketArchives(
      discord,
      archivesChannelId,
      applicationId,
      (page - 1) * ARCHIVES_PER_PAGE,
      {
        ...(filters.kind === null
          ? {}
          : { text: REQUEST_KINDS[filters.kind].emoji }),
        ...period,
        oldestFirst: filters.sort === "oldest",
      }
    )
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
  const offset = (page - 1) * ARCHIVES_PER_PAGE
  return {
    kind: "page",
    filters,
    archives: await pagedArchives(
      discord,
      found.archives.filter(
        ({ requestKind }) =>
          filters.kind === null ||
          requestKindKeyOf(requestKind) === filters.kind
      )
    ),
    page,
    pages,
    first: found.messages === 0 ? 0 : offset + 1,
    last: offset + found.messages,
    total: found.total,
    complete: found.total <= MAX_ARCHIVES_READ,
    limit: "offset",
    kindCounts: {
      kind: "to-search",
      archivesChannelId,
      applicationId,
      period,
      chosen:
        filters.kind === null
          ? null
          : { key: filters.kind, total: found.total },
    },
    accountNotice: null,
  }
}
