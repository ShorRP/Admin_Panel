"use server"

import { refresh } from "next/cache"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { addAllowedDomain } from "./add-allowed-domain"
import { addExemptChannel } from "./add-exempt-channel"
import { addExemptRole } from "./add-exempt-role"
import { changeLinkRuleAction } from "./change-link-rule-action"
import { removeAllowedDomain } from "./remove-allowed-domain"
import { removeExemptChannel } from "./remove-exempt-channel"
import { removeExemptRole } from "./remove-exempt-role"
import { switchLinkRule } from "./switch-link-rule"
import type {
  ActionFields,
  ChannelFields,
  DomainFields,
  RoleFields,
  WriteResult,
} from "./write-result"

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

export async function addExemptRoleAction(
  _previous: WriteResult<RoleFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await addExemptRole(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}

export async function removeExemptRoleAction(
  _previous: WriteResult<RoleFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await removeExemptRole(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}

export async function addExemptChannelAction(
  _previous: WriteResult<ChannelFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await addExemptChannel(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}

export async function removeExemptChannelAction(
  _previous: WriteResult<ChannelFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await removeExemptChannel(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}

export async function changeLinkRuleActionAction(
  _previous: WriteResult<ActionFields> | null,
  formData: FormData
) {
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const result = await changeLinkRuleAction(discord, staffMember, formData)
  if (result.ok) {
    refresh()
  }
  return result
}
