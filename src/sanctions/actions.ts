"use server"

import { refresh } from "next/cache"

import { createDiscordApi } from "@/discord/discord-api"
import { requireModerationAccess } from "@/staff/require-staff-member"
import { changeTimeout } from "./change-timeout"
import type { TimeoutResult } from "./timeout-result"

export async function changeTimeoutAction(
  _previous: TimeoutResult | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireModerationAccess(discord)
  const result = await changeTimeout(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}
