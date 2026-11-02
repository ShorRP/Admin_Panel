import { DiscordError } from "@/discord/discord-error"

export type WordFields = { word: string; action: string }

export type WriteResult =
  { ok: true; message: string } | ({ ok: false; message: string } & WordFields)

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

export function failure(message: string, fields: WordFields): WriteResult {
  return { ok: false, message, ...fields }
}

export async function unlessDiscordUnavailable<Done>(
  fields: WordFields,
  write: () => Promise<Done>,
  unavailable = DISCORD_UNAVAILABLE
): Promise<Done | WriteResult> {
  try {
    return await write()
  } catch (error) {
    if (error instanceof DiscordError && error.unavailable) {
      return failure(unavailable, fields)
    }
    throw error
  }
}
