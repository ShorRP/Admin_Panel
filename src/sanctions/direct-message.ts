import "server-only"

import { RESTJSONErrorCodes, type Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"

export type DirectMessageOutcome = "sent" | "refused" | "unavailable"

const REFUSALS: number[] = [
  RESTJSONErrorCodes.CannotSendMessagesToThisUser,
  RESTJSONErrorCodes.CannotSendMessagesToThisUserDueToHavingNoMutualGuilds,
  RESTJSONErrorCodes.OpeningDirectMessagesTooFast,
]

export const DIRECT_MESSAGE_OUTCOMES: Record<
  DirectMessageOutcome,
  (name: string) => string
> = {
  sent: () => "Le message privé est parti.",
  refused: (name) =>
    `${name} n’a pas reçu le message privé : Discord l’a refusé.`,
  unavailable: (name) =>
    `${name} n’a peut-être pas reçu le message privé : Discord n’a pas répondu.`,
}

export async function sendDirectMessage(
  discord: DiscordApi,
  userId: Snowflake,
  content: string
): Promise<DirectMessageOutcome> {
  try {
    const channel = await discord.createDm(userId)
    await discord.createMessage(channel.id, {
      content,
      allowed_mentions: { parse: [] },
    })
    return "sent"
  } catch (error) {
    if (!(error instanceof DiscordError)) {
      throw error
    }
    if (error.code !== undefined && REFUSALS.includes(error.code)) {
      return "refused"
    }
    if (error.unavailable) {
      return "unavailable"
    }
    throw error
  }
}
