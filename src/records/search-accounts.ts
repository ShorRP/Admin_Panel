import "server-only"

import type { APIBan, APIUser, Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import { memberAvatarUrl, userAvatarUrl } from "@/discord/member-avatar-url"
import { memberName, userName } from "@/discord/member-name"
import { ACCOUNT_ID } from "./account-id"
import type { AccountStanding } from "./account-standing"
import { timeoutEndOf } from "./timeout-end"

export type FoundAccount = {
  id: Snowflake
  name: string
  username: string
  avatarUrl: string | null
  standing: AccountStanding
}

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

const MENTION = /^<@!?(\d+)>$/

const MAX_ACCOUNTS = 25

const DISCORD_BANS_PAGE = 1000

export async function searchAccounts(
  discord: DiscordApi,
  queryParam: unknown
): Promise<AccountSearch> {
  const query = QUERY.parse(queryParam)
  if (query === undefined) {
    return { kind: "none" }
  }
  const userId = ACCOUNT_ID.safeParse(MENTION.exec(query)?.[1] ?? query)
  if (userId.success) {
    return { kind: "record", userId: userId.data }
  }
  const [members, bans] = await Promise.all([
    discord.searchMembers({ query, limit: MAX_ACCOUNTS + 1 }),
    allBans(discord),
  ])
  const found: FoundAccount[] = [
    ...members.map((member): FoundAccount => ({
      ...accountOf(member.user, memberAvatarUrl(discord.guildId, member)),
      name: memberName(member),
      standing: {
        kind: "member",
        timedOutUntil: timeoutEndOf(member.communication_disabled_until),
      },
    })),
    ...bans
      .filter(({ user }) => startsWithIgnoringCase(user.username, query))
      .map(({ user }): FoundAccount => ({
        ...accountOf(user, userAvatarUrl(user)),
        standing: { kind: "banned" },
      })),
  ]
  return {
    kind: "accounts",
    query,
    accounts: found.slice(0, MAX_ACCOUNTS),
    truncated: found.length > MAX_ACCOUNTS,
  }
}

async function allBans(discord: DiscordApi) {
  const bans: APIBan[] = []
  let after: Snowflake | undefined
  for (;;) {
    const page = await discord.listBans({
      limit: DISCORD_BANS_PAGE,
      ...(after === undefined ? {} : { after }),
    })
    bans.push(...page)
    const last = page.at(-1)
    if (last === undefined || page.length < DISCORD_BANS_PAGE) {
      return bans
    }
    after = last.user.id
  }
}

function accountOf(user: APIUser, avatarUrl: string | null) {
  return {
    id: user.id,
    name: userName(user),
    username: user.username,
    avatarUrl,
  }
}

function startsWithIgnoringCase(text: string, start: string) {
  return text.toLocaleLowerCase().startsWith(start.toLocaleLowerCase())
}

export function searchedText(queryParam: unknown) {
  return typeof queryParam === "string" ? queryParam : ""
}
