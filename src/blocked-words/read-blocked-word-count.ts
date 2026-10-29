import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import type { StaffMember } from "@/staff/staff-member"
import { readBlockedWords } from "./read-blocked-words"

export async function readBlockedWordCount(
  discord: DiscordApi,
  staffCheck: Promise<StaffMember>
): Promise<number | null> {
  try {
    await staffCheck
  } catch {
    return null
  }
  try {
    return (await readBlockedWords(discord)).words.length
  } catch (error) {
    if (error instanceof DiscordError) {
      return null
    }
    throw error
  }
}
