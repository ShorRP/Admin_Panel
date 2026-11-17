"use server"

import { refresh } from "next/cache"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { addAllowedDomain } from "./add-allowed-domain"
import { removeAllowedDomain } from "./remove-allowed-domain"
import { switchLinkRule } from "./switch-link-rule"
import type { DomainFields, WriteResult } from "./write-result"

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

export async function addAllowedDomainAction(
  _previous: WriteResult<DomainFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await addAllowedDomain(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}

export async function removeAllowedDomainAction(
  _previous: WriteResult<DomainFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await removeAllowedDomain(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}
