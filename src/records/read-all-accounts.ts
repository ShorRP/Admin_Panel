import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"

const DISCORD_PAGE = 1000

export async function readAllMembers(discord: DiscordApi) {
  return await readAllPages(
    (after) => discord.listMembers({ limit: DISCORD_PAGE, ...after }),
    ({ user }) => user.id
  )
}

export async function readAllBans(discord: DiscordApi) {
  return await readAllPages(
    (after) => discord.listBans({ limit: DISCORD_PAGE, ...after }),
    ({ user }) => user.id
  )
}

async function readAllPages<T>(
  readPage: (after: { after?: Snowflake }) => Promise<T[]>,
  idOf: (item: T) => Snowflake
) {
  const items: T[] = []
  let after: { after?: Snowflake } = {}
  for (;;) {
    const page = await readPage(after)
    items.push(...page)
    const last = page.at(-1)
    if (last === undefined || page.length < DISCORD_PAGE) {
      return items
    }
    after = { after: idOf(last) }
  }
}
