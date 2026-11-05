import { z } from "zod"

import { dayParamOf } from "@/ui/filter-params"
import { REQUEST_KIND_KEYS, type RequestKindKey } from "./request-kinds"

const MAX_SEARCHED_TEXT_LENGTH = 1024

const WORD = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

export type TicketArchiveFilters = {
  kind: RequestKindKey | null
  opener: string | null
  closer: string | null
  reason: string | null
  from: string | null
  to: string | null
  on: "opened" | null
  sort: "oldest" | null
}

export type TicketArchiveSearchParams = {
  kind?: unknown
  opener?: unknown
  closer?: unknown
  reason?: unknown
  from?: unknown
  to?: unknown
  on?: unknown
  sort?: unknown
  page?: unknown
}

export const NO_FILTERS: TicketArchiveFilters = {
  kind: null,
  opener: null,
  closer: null,
  reason: null,
  from: null,
  to: null,
  on: null,
  sort: null,
}

const KIND = z.enum(REQUEST_KIND_KEYS).nullable().catch(null)

const ACCOUNT_TEXT = z.string().trim().min(1).max(100).nullable().catch(null)

const REASON = z
  .string()
  .trim()
  .min(1)
  .max(MAX_SEARCHED_TEXT_LENGTH)
  .refine((text) => WORD.test(text))
  .nullable()
  .catch(null)

const ON = z.literal("opened").nullable().catch(null)

const SORT = z.literal("oldest").nullable().catch(null)

export function ticketArchiveFiltersOf(
  searchParams: TicketArchiveSearchParams
): TicketArchiveFilters {
  const from = dayParamOf(searchParams.from)
  const to = dayParamOf(searchParams.to)
  return {
    kind: KIND.parse(searchParams.kind),
    opener: ACCOUNT_TEXT.parse(searchParams.opener),
    closer: ACCOUNT_TEXT.parse(searchParams.closer),
    reason: REASON.parse(searchParams.reason),
    from,
    to,
    on: from === null && to === null ? null : ON.parse(searchParams.on),
    sort: SORT.parse(searchParams.sort),
  }
}

export function hasFilter(filters: TicketArchiveFilters) {
  return Object.values(filters).some((value) => value !== null)
}

export function readsOldestFirst(
  filters: Pick<TicketArchiveFilters, "on" | "sort">
) {
  return filters.on === "opened" || filters.sort === "oldest"
}
