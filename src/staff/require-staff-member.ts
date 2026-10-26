import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { DiscordApi } from "@/discord/discord-api"
import { parseStaffEnv } from "./env"
import { SESSION_COOKIE, sessionUserId } from "./session"
import { findStaffMember, type StaffMember } from "./staff-member"

export async function requireStaffMember(
  discord: DiscordApi
): Promise<StaffMember> {
  const { staffRoleId, sessionSecret } = parseStaffEnv(process.env)
  const userId = await sessionUserId(
    (await cookies()).get(SESSION_COOKIE)?.value,
    sessionSecret
  )
  if (userId === null) {
    redirect("/login")
  }
  const staffMember = await findStaffMember(discord, staffRoleId, userId)
  if (staffMember === null) {
    redirect("/login/refused")
  }
  return staffMember
}
