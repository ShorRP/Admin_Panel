import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { lowerCaseNames } from "@/records/account-candidate"
import { accountIdOf } from "@/records/account-id"
import { readAllBans, readAllMembers } from "@/records/read-all-accounts"

export type ResolvedAccount =
  { kind: "account"; id: Snowflake } | { kind: "none" } | { kind: "several" }

type NamedAccount = { id: Snowflake; names: string[] }

export async function resolveAccounts(
  discord: DiscordApi,
  texts: readonly string[]
) {
  const resolved = new Map<string, ResolvedAccount>()
  const names = texts.filter((text) => accountIdOf(text) === null)
  const accounts = names.length === 0 ? [] : await namedAccounts(discord)
  for (const text of texts) {
    const id = accountIdOf(text)
    resolved.set(
      text,
      id === null
        ? accountNamed(text.toLocaleLowerCase(), accounts)
        : { kind: "account", id }
    )
  }
  return resolved
}

async function namedAccounts(discord: DiscordApi): Promise<NamedAccount[]> {
  const [members, bans] = await Promise.all([
    readAllMembers(discord),
    readAllBans(discord),
  ])
  return [
    ...members.map(({ user, nick }) => ({
      id: user.id,
      names: lowerCaseNames(user, nick),
    })),
    ...bans.map(({ user }) => ({
      id: user.id,
      names: lowerCaseNames(user, null),
    })),
  ]
}

function accountNamed(
  start: string,
  accounts: readonly NamedAccount[]
): ResolvedAccount {
  const starting = accounts.filter(({ names }) =>
    names.some((name) => name.startsWith(start))
  )
  const exactly = starting.filter(({ names }) => names.includes(start))
  const chosen = starting.length === 1 ? starting : exactly
  const [only] = chosen
  if (only !== undefined && chosen.length === 1) {
    return { kind: "account", id: only.id }
  }
  return starting.length === 0 ? { kind: "none" } : { kind: "several" }
}
