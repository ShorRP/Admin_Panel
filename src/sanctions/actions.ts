"use server"

import { refresh } from "next/cache"

import { createDiscordApi } from "@/discord/discord-api"
import { requireModerationAccess } from "@/staff/require-staff-member"
import { changeSanction } from "./change-sanction"
import type { SanctionResult } from "./sanction-result"

export async function changeSanctionAction(
  _previous: SanctionResult | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireModerationAccess(discord)
  const result = await changeSanction(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}
