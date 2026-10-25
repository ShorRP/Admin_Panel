import { connection, type NextRequest } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { createDiscordOAuth } from "@/discord/discord-oauth"
import { createMonitor } from "@/monitoring/monitor"
import { completeLogin } from "@/staff/login"

export async function GET(request: NextRequest) {
  await connection()
  return await completeLogin(request, createMonitor(), {
    discord: createDiscordApi,
    oauth: createDiscordOAuth,
  })
}
