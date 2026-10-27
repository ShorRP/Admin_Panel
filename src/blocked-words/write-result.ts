import { DiscordError } from "@/discord/discord-error"

export type WriteResult =
  { ok: true; message: string } | { ok: false; message: string; word: string }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

export function failure(message: string, typed: string): WriteResult {
  return { ok: false, message, word: typed }
}

export async function unlessDiscordUnavailable(
  typed: string,
  write: () => Promise<WriteResult>
): Promise<WriteResult> {
  try {
    return await write()
  } catch (error) {
    if (error instanceof DiscordError && error.unavailable) {
      return failure(DISCORD_UNAVAILABLE, typed)
    }
    throw error
  }
}
