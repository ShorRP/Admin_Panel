import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { banAccount } from "./ban-account"
import { changeTimeout } from "./change-timeout"
import { kickMember } from "./kick-member"
import { liftBan } from "./lift-ban"
import type { SanctionResult } from "./sanction-result"

export async function changeSanction(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<SanctionResult> {
  switch (formData.get("change")) {
    case "kick":
      return await kickMember(discord, staffMember, formData)
    case "ban":
      return await banAccount(discord, staffMember, formData)
    case "lift-ban":
      return await liftBan(discord, staffMember, formData)
    default:
      return await changeTimeout(discord, staffMember, formData)
  }
}
