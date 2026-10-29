import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { DIRECT_MESSAGE_OUTCOMES, sendDirectMessage } from "./direct-message"
import { unlessDiscordUnavailable } from "./discord-unavailable"
import type { SanctionFields, SanctionResult } from "./sanction-result"

const SENT_BEFORE_RETRY =
  "Le message privé est parti : décoche « Prévenir en message privé » avant de réessayer."

export async function sanctionAfterDirectMessage<
  Fields extends SanctionFields,
>({
  discord,
  userId,
  name,
  directMessage,
  sanction,
  landed,
  maybeLanded,
  fields,
}: {
  discord: DiscordApi
  userId: Snowflake
  name: string
  directMessage: string | null
  sanction: () => Promise<void>
  landed: string
  maybeLanded: string
  fields: Fields
}): Promise<SanctionResult<Fields>> {
  const [sent] = await Promise.allSettled([
    directMessage === null
      ? null
      : sendDirectMessage(discord, userId, directMessage),
  ])
  const sanctioned = await unlessDiscordUnavailable(async () => {
    await sanction()
    return true
  }, false)
  if (sent.status === "rejected") {
    throw sent.reason
  }
  const outcome = sent.value
  if (sanctioned) {
    return {
      ok: true,
      message:
        outcome === null
          ? landed
          : `${landed} ${DIRECT_MESSAGE_OUTCOMES[outcome](name)}`,
    }
  }
  return {
    ok: false,
    message:
      outcome === null
        ? maybeLanded
        : `${maybeLanded} ${outcome === "sent" ? SENT_BEFORE_RETRY : DIRECT_MESSAGE_OUTCOMES[outcome](name)}`,
    ...fields,
  }
}
