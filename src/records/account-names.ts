import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { memberName, userName } from "@/discord/member-name"

export async function accountNames(
  discord: DiscordApi,
  accountIds: Iterable<Snowflake>
) {
  const names = new Map<Snowflake, string | null>()
  await Promise.all(
    [...new Set(accountIds)].map(async (id) => {
      const member = await discord.getMember(id)
      if (member !== null) {
        names.set(id, memberName(member))
        return
      }
      const user = await discord.getUser(id)
      names.set(id, user === null ? null : userName(user))
    })
  )
  return names
}
