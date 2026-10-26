"use server"

import { refresh } from "next/cache"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { addBlockedWord } from "./add-blocked-word"
import { removeBlockedWord } from "./remove-blocked-word"
import type { WriteResult } from "./write-result"

export async function addBlockedWordAction(
  _previous: WriteResult | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await addBlockedWord(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}

export async function removeBlockedWordAction(
  _previous: WriteResult | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await removeBlockedWord(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}
