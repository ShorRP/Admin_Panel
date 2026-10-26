import "server-only"

import { NextResponse, type NextRequest } from "next/server"

import type { Monitor } from "@/monitoring/monitor"
import { parseStaffEnv } from "./env"
import { SESSION_COOKIE, sessionUserId } from "./session"

export async function redirectWithoutSession(
  request: NextRequest,
  monitor: Monitor
) {
  try {
    const { sessionSecret } = parseStaffEnv(process.env)
    const userId = await sessionUserId(
      request.cookies.get(SESSION_COOKIE)?.value,
      sessionSecret
    )
    return userId === null
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next()
  } catch (error) {
    monitor.error(error)
    return NextResponse.next()
  }
}
