import "server-only"

import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import { readServedPage } from "./read-served-page"
import { readWindowPage } from "./read-window-page"
import {
  isOpenedPeriod,
  ticketArchiveFiltersOf,
  type TicketArchiveFilters,
  type TicketArchiveSearchParams,
} from "./ticket-archive-filters"
import { MAX_PAGE, type TicketArchivePage } from "./ticket-archive-page"

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
  searchParams: TicketArchiveSearchParams
): Promise<TicketArchivePage> {
  if (archivesChannelId === null) {
    return { kind: "unconfigured" }
  }
  const filters = ticketArchiveFiltersOf(searchParams)
  const { id: applicationId } = await discord.getApplicationUser()
  const context = {
    discord,
    archivesChannelId,
    applicationId,
    filters,
    requested: PAGE.parse(searchParams.page) ?? 1,
  }
  return needsWindow(filters)
    ? await readWindowPage(context)
    : await readServedPage(context)
}

function needsWindow(filters: TicketArchiveFilters) {
  return (
    filters.opener !== null ||
    filters.closer !== null ||
    filters.reason !== null ||
    isOpenedPeriod(filters)
  )
}
