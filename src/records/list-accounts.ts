import "server-only"

import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import { compareIds } from "./compare-ids"
import { foundBan, foundMember, type FoundAccount } from "./found-account"
import { readAllBans, readAllMembers } from "./read-all-accounts"
import { highestRoleOf, rolesByHierarchy } from "./role-hierarchy"
import { searchAccounts, type AccountSearch } from "./search-accounts"

const ACCOUNTS_PER_PAGE = 25

export type AccountListPage = {
  kind: "page"
  accounts: FoundAccount[]
  page: number
  pages: number
  first: number
  last: number
  total: number
}

export type AccountListing =
  Exclude<AccountSearch, { kind: "none" }> | AccountListPage

const PAGE = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1))
  .optional()
  .catch(undefined)

const nameCollator = new Intl.Collator("fr-FR", { sensitivity: "accent" })

export async function listAccounts(
  discord: DiscordApi,
  { query, page }: { query: unknown; page: unknown }
): Promise<AccountListing> {
  const search = await searchAccounts(discord, query)
  if (search.kind !== "none") {
    return search
  }
  const [members, bans, roles] = await Promise.all([
    readAllMembers(discord),
    readAllBans(discord),
    discord.listRoles(),
  ])
  const hierarchy = rolesByHierarchy(roles)
  const accounts = [
    ...members.map((member) =>
      foundMember(discord, member, highestRoleOf(member.roles, hierarchy))
    ),
    ...bans.map(foundBan),
  ].toSorted(byNameThenId)
  return pageOf(accounts, PAGE.parse(page))
}

function pageOf(
  accounts: FoundAccount[],
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
    page,
    pages,
    first: shown.length === 0 ? 0 : start + 1,
    last: start + shown.length,
    total,
  }
}

function byNameThenId(left: FoundAccount, right: FoundAccount) {
  return (
    nameCollator.compare(left.name, right.name) || compareIds(left.id, right.id)
  )
}
