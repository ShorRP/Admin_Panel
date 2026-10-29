import { DiscordError } from "@/discord/discord-error"

export async function unlessDiscordUnavailable<T, U>(
  run: () => Promise<T>,
  unavailable: U
): Promise<T | U> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof DiscordError && error.unavailable) {
      return unavailable
    }
    throw error
  }
}
