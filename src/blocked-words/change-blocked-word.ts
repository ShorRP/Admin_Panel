import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { changeActionOfBlockedWord } from "./change-action-of-blocked-word"
import { removeBlockedWord } from "./remove-blocked-word"
import type { WriteResult } from "./write-result"

export async function changeBlockedWord(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<WriteResult> {
  switch (formData.get("change")) {
    case "action":
      return await changeActionOfBlockedWord(discord, staffMember, formData)
    default:
      return await removeBlockedWord(discord, staffMember, formData)
  }
}
