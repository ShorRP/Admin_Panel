import "server-only"

import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { changeTimeout } from "./change-timeout"
import { kickMember } from "./kick-member"
import type { SanctionResult } from "./sanction-result"

export async function changeSanction(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<SanctionResult> {
  return formData.get("change") === "kick"
    ? await kickMember(discord, staffMember, formData)
    : await changeTimeout(discord, staffMember, formData)
}
