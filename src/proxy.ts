import type { NextRequest } from "next/server"

import { createMonitor } from "@/monitoring/monitor"
import { redirectWithoutSession } from "@/staff/redirect-without-session"

export async function proxy(request: NextRequest) {
  return await redirectWithoutSession(request, createMonitor())
}

export const config = {
  matcher: "/((?!login(?:/|$)|interactions$|_next/|.*\\.[^/]+$).*)",
}
