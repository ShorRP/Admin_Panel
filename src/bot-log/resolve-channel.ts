import type { Snowflake } from "discord-api-types/v10"

import type { GuildChannel } from "@/discord/discord-api"

export type ResolvedChannel =
  { kind: "channel"; id: Snowflake } | { kind: "none" } | { kind: "several" }

const CHANNEL_ID = /^(?:<#(\d{17,20})>|(\d{17,20}))$/

export function resolveChannel(
  text: string,
  channels: readonly Pick<GuildChannel, "id" | "name">[]
): ResolvedChannel {
  const direct = CHANNEL_ID.exec(text.trim())
  const id = direct?.[1] ?? direct?.[2]
  if (id !== undefined) {
    return { kind: "channel", id }
  }
  const wanted = text.trim().replace(/^#/, "").toLocaleLowerCase()
  const containing = channels.filter(({ name }) =>
    name.toLocaleLowerCase().includes(wanted)
  )
  const exactly = containing.filter(
    ({ name }) => name.toLocaleLowerCase() === wanted
  )
  const chosen = containing.length === 1 ? containing : exactly
  const [only] = chosen
  if (only !== undefined && chosen.length === 1) {
    return { kind: "channel", id: only.id }
  }
  return containing.length === 0 ? { kind: "none" } : { kind: "several" }
}
