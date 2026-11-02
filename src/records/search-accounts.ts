import "server-only"

import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import { accountIdOf } from "./account-id"
import { foundBan, foundMember, type FoundAccount } from "./found-account"
import { readAllBans } from "./read-all-accounts"

export type AccountSearch =
  | { kind: "none" }
  | { kind: "record"; userId: Snowflake }
  | {
      kind: "accounts"
      query: string
      accounts: FoundAccount[]
      truncated: boolean
    }

const QUERY = z.string().trim().min(1).optional().catch(undefined)

const MAX_ACCOUNTS = 25

export async function searchAccounts(
  discord: DiscordApi,
  queryParam: unknown
): Promise<AccountSearch> {
  const query = QUERY.parse(queryParam)
  if (query === undefined) {
    return { kind: "none" }
  }
  const userId = accountIdOf(query)
  if (userId !== null) {
    return { kind: "record", userId }
  }
  const [members, bans] = await Promise.all([
    discord.searchMembers({ query, limit: MAX_ACCOUNTS + 1 }),
    readAllBans(discord),
  ])
  const found: FoundAccount[] = [
    ...members.map((member) => foundMember(discord, member, null)),
    ...bans
      .filter(({ user }) => startsWithIgnoringCase(user.username, query))
      .map(foundBan),
  ]
  return {
    kind: "accounts",
    query,
    accounts: found.slice(0, MAX_ACCOUNTS),
    truncated: found.length > MAX_ACCOUNTS,
  }
}

function startsWithIgnoringCase(text: string, start: string) {
  return text.toLocaleLowerCase().startsWith(start.toLocaleLowerCase())
}

export function searchedText(queryParam: unknown) {
  return typeof queryParam === "string" ? queryParam : ""
}
