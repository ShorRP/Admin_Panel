import { connection } from "next/server"

import { createDiscordOAuth } from "@/discord/discord-oauth"
import { startLogin } from "@/staff/login"

export async function GET() {
  await connection()
  return startLogin(createDiscordOAuth())
}
