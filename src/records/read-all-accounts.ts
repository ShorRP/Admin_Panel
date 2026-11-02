import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"

const DISCORD_PAGE = 1000

type Cursor = { after?: Snowflake }

export async function readAllMembers(discord: DiscordApi) {
  return await readAllPages((cursor) =>
    discord.listMembers({ limit: DISCORD_PAGE, ...cursor })
  )
}

export async function readAllBans(discord: DiscordApi) {
  return await readAllPages((cursor) =>
    discord.listBans({ limit: DISCORD_PAGE, ...cursor })
  )
}

async function readAllPages<T extends { user: { id: Snowflake } }>(
  readPage: (cursor: Cursor) => Promise<T[]>
) {
  const items: T[] = []
  let cursor: Cursor = {}
  for (;;) {
    const page = await readPage(cursor)
    items.push(...page)
    const last = page.at(-1)
    if (last === undefined || page.length < DISCORD_PAGE) {
      return items
    }
    cursor = { after: last.user.id }
  }
}
