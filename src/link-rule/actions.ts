"use server"

import { refresh } from "next/cache"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { switchLinkRule } from "./switch-link-rule"
import type { WriteResult } from "./write-result"

export async function switchLinkRuleAction(
  _previous: WriteResult | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await switchLinkRule(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}
