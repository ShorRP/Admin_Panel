import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import type { StaffMember } from "@/staff/staff-member"
import { isPanelRule, keywordsOf } from "./panel-rule"

export async function readBlockedWordCount(
  discord: DiscordApi,
  staffMember: Promise<StaffMember>
): Promise<number | null> {
  try {
    await staffMember
  } catch {
    return null
  }
  try {
    const rule = (await discord.listAutoModerationRules()).find(isPanelRule)
    return rule === undefined ? 0 : keywordsOf(rule).length
  } catch (error) {
    if (error instanceof DiscordError) {
      return null
    }
    throw error
  }
}
