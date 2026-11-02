import "server-only"

import type { APIRole, Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import { banCandidate, memberCandidate } from "./account-candidate"
import { accountIdOf } from "./account-id"
import {
  accountListFormOf,
  queryOf,
  type AccountListFilters,
  type AccountListSearchParams,
} from "./account-list-filters"
import { filterAccounts } from "./filter-accounts"
import type { FoundAccount } from "./found-account"
import { readAllBans, readAllMembers } from "./read-all-accounts"
import { rolesByHierarchy } from "./role-hierarchy"
import { sortAccounts } from "./sort-accounts"

const ACCOUNTS_PER_PAGE = 25

export type AccountListPage = {
  kind: "page"
  accounts: FoundAccount[]
  filters: AccountListFilters
  page: number
  pages: number
  first: number
  last: number
  total: number
}

export type AccountListing =
  { kind: "record"; userId: Snowflake } | AccountListPage

const PAGE = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1))
  .optional()
  .catch(undefined)

export async function listAccounts(
  discord: DiscordApi,
  searchParams: AccountListSearchParams,
  roles: Promise<readonly APIRole[]>
): Promise<AccountListing> {
  const query = queryOf(searchParams.query)
  const userId = query === null ? null : accountIdOf(query)
  if (userId !== null) {
    return { kind: "record", userId }
  }
  const [members, bans, roleList] = await Promise.all([
    readAllMembers(discord),
    readAllBans(discord),
    roles,
  ])
  const hierarchy = rolesByHierarchy(roleList)
  const { filters } = accountListFormOf(searchParams, roleList, discord.guildId)
  const candidates = [
    ...members.map((member) => memberCandidate(discord, member, hierarchy)),
    ...bans.map(banCandidate),
  ]
  const accounts = sortAccounts(
    filterAccounts(candidates, filters, new Date()),
    filters.sort
  ).map(({ account }) => account)
  return pageOf(accounts, filters, PAGE.parse(searchParams.page))
}

function pageOf(
  accounts: FoundAccount[],
  filters: AccountListFilters,
  requested: number | undefined
): AccountListPage {
  const total = accounts.length
  const pages = Math.max(1, Math.ceil(total / ACCOUNTS_PER_PAGE))
  const page = requested === undefined || requested > pages ? 1 : requested
  const start = (page - 1) * ACCOUNTS_PER_PAGE
  const shown = accounts.slice(start, start + ACCOUNTS_PER_PAGE)
  return {
    kind: "page",
    accounts: shown,
    filters,
    page,
    pages,
    first: shown.length === 0 ? 0 : start + 1,
    last: start + shown.length,
    total,
  }
}
