import "server-only"

import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { canViewChannel } from "./can-view-channel"
import { parseStaffEnv } from "./env"
import { SESSION_COOKIE, sessionUserId } from "./session"
import { findStaffMember, type StaffMember } from "./staff-member"

export async function requireStaffMember(
  discord: DiscordApi
): Promise<StaffMember> {
  const env = parseStaffEnv(process.env)
  const userId = await sessionUserId(
    (await cookies()).get(SESSION_COOKIE)?.value,
    env.sessionSecret
  )
  if (userId === null) {
    redirect("/login")
  }
  const staffMember = await findStaffMember(discord, env, userId)
  if (staffMember === null) {
    redirect("/login/refused")
  }
  return staffMember
}

export async function requireModerationAccess(
  discord: DiscordApi
): Promise<StaffMember> {
  const staffMember = await requireStaffMember(discord)
  if (!staffMember.opensModeration) {
    notFound()
  }
  return staffMember
}

export async function requireChannelAccess(
  discord: DiscordApi,
  channelId: Snowflake
): Promise<StaffMember> {
  const staffMember = await requireStaffMember(discord)
  if (!(await canViewChannel(discord, staffMember, channelId))) {
    notFound()
  }
  return staffMember
}
