import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import { MAX_SEARCHES } from "@/discord/message-search-limits"
import { periodBounds } from "@/discord/period-bounds"
import { holdsWords, longestTermOf } from "@/discord/search-words"
import {
  resolveAccounts,
  type ResolvedAccount,
} from "@/records/resolve-accounts"
import {
  parisDayAfter,
  parisDayStart,
  parisPeriodOf,
} from "@/ui/paris-day-bounds"
import { requestKindKeyOf } from "./request-kinds"
import {
  ARCHIVES_PER_PAGE,
  searchTicketArchives,
} from "./search-ticket-archives"
import type { TicketArchive } from "./ticket-archive"
import {
  readsOldestFirst,
  type TicketArchiveFilters,
} from "./ticket-archive-filters"
import {
  pagedArchives,
  WINDOW_SIZE,
  type AccountNotice,
  type ArchivesPage,
  type KindCounts,
  type ReadContext,
} from "./ticket-archive-page"

type AccountIds = { openerId: Snowflake | null; closerId: Snowflake | null }

export async function readWindowPage(
  context: ReadContext
): Promise<ArchivesPage> {
  const { discord, filters, requested } = context
  const accounts = await resolveAccounts(
    discord,
    [filters.opener, filters.closer].filter((text) => text !== null)
  )
  const notice = accountNoticeOf(filters, accounts)
  if (notice !== null) {
    return windowPage(filters, [], zeroCounts(), {
      accountNotice: notice,
      complete: true,
    })
  }
  const ids = {
    openerId: accountIdOf(filters.opener, accounts),
    closerId: accountIdOf(filters.closer, accounts),
  }
  const { candidates, complete } = await readCandidates(context, ids)
  const matching = candidates.filter((archive) =>
    matches(archive, filters, ids)
  )
  const ordered = matching
    .filter(
      ({ requestKind }) =>
        filters.kind === null || requestKindKeyOf(requestKind) === filters.kind
    )
    .toSorted(({ messageId: left }, { messageId: right }) =>
      filters.sort === "oldest"
        ? compareIds(left, right)
        : compareIds(right, left)
    )
  const pages = Math.max(1, Math.ceil(ordered.length / ARCHIVES_PER_PAGE))
  const page = requested > pages ? 1 : requested
  const offset = (page - 1) * ARCHIVES_PER_PAGE
  const shown = ordered.slice(offset, offset + ARCHIVES_PER_PAGE)
  return windowPage(
    filters,
    await pagedArchives(discord, shown),
    tally(matching),
    {
      complete,
      page,
      pages,
      total: ordered.length,
      first: shown.length === 0 ? 0 : offset + 1,
      last: offset + shown.length,
    }
  )
}

async function readCandidates(
  { discord, archivesChannelId, applicationId, filters }: ReadContext,
  ids: AccountIds
) {
  const text = servedText(filters, ids)
  const oldestFirst = readsOldestFirst(filters)
  const period = periodBounds(
    parisPeriodOf(
      filters.on === "opened" ? { from: filters.from, to: null } : filters
    )
  )
  const candidates = new Map<Snowflake, TicketArchive>()
  let discordTotal = 0
  for (let search = 0; search < MAX_SEARCHES; search++) {
    const offset = search * ARCHIVES_PER_PAGE
    const found = await searchTicketArchives(
      discord,
      archivesChannelId,
      applicationId,
      offset,
      { ...(text === undefined ? {} : { text }), ...period, oldestFirst }
    )
    discordTotal = found.total
    for (const archive of found.archives) {
      candidates.set(archive.messageId, archive)
    }
    if (offset + ARCHIVES_PER_PAGE >= found.total) {
      break
    }
  }
  return {
    candidates: [...candidates.values()],
    complete: discordTotal <= WINDOW_SIZE,
  }
}

function windowPage(
  filters: TicketArchiveFilters,
  archives: ArchivesPage["archives"],
  counts: KindCounts,
  {
    complete,
    accountNotice = null,
    page = 1,
    pages = 1,
    total = 0,
    first = 0,
    last = 0,
  }: {
    complete: boolean
    accountNotice?: AccountNotice | null
    page?: number
    pages?: number
    total?: number
    first?: number
    last?: number
  }
): ArchivesPage {
  return {
    kind: "page",
    filters,
    archives,
    page,
    pages,
    first,
    last,
    total,
    complete,
    limit: "window",
    kindCounts: { kind: "known", counts },
    accountNotice,
  }
}

function servedText(filters: TicketArchiveFilters, ids: AccountIds) {
  return (
    ids.openerId ??
    ids.closerId ??
    (filters.reason === null ? undefined : longestTermOf(filters.reason))
  )
}

function accountIdOf(
  text: string | null,
  accounts: ReadonlyMap<string, ResolvedAccount>
) {
  const account = text === null ? undefined : accounts.get(text)
  return account?.kind === "account" ? account.id : null
}

function accountNoticeOf(
  filters: TicketArchiveFilters,
  accounts: ReadonlyMap<string, ResolvedAccount>
): AccountNotice | null {
  for (const filter of ["opener", "closer"] as const) {
    const text = filters[filter]
    const account = text === null ? undefined : accounts.get(text)
    if (text !== null && account !== undefined && account.kind !== "account") {
      return { filter, text, kind: account.kind }
    }
  }
  return null
}

function matches(
  archive: TicketArchive,
  filters: TicketArchiveFilters,
  { openerId, closerId }: AccountIds
) {
  return (
    (filters.opener === null || archive.openerId === openerId) &&
    (filters.closer === null || archive.closerId === closerId) &&
    (filters.reason === null || holdsWords(archive.reason, filters.reason)) &&
    (filters.on !== "opened" || openedWithin(archive.openedAt, filters))
  )
}

function openedWithin(
  openedAt: Date,
  { from, to }: Pick<TicketArchiveFilters, "from" | "to">
) {
  return (
    (from === null || openedAt >= parisDayStart(from)) &&
    (to === null || openedAt < parisDayAfter(to))
  )
}

function tally(archives: readonly TicketArchive[]): KindCounts {
  const counts = zeroCounts()
  for (const { requestKind } of archives) {
    const key = requestKindKeyOf(requestKind)
    if (key !== null) {
      counts[key]++
    }
  }
  return counts
}

function zeroCounts(): KindCounts {
  return {
    "technical-issue": 0,
    "player-report": 0,
    "rp-request": 0,
    "other-request": 0,
  }
}

function compareIds(left: Snowflake, right: Snowflake) {
  const difference = BigInt(left) - BigInt(right)
  return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0
}
