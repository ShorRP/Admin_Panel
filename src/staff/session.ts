import "server-only"

import { cookies } from "next/headers"
import { sealData, unsealData } from "iron-session"
import { z } from "zod"

import { HOST_COOKIE_ATTRIBUTES } from "./host-cookie"

export const SESSION_COOKIE = "__Host-session"

const SESSION_TTL_S = 7 * 24 * 60 * 60

const SESSION = z.object({ userId: z.string() })

export async function sessionCookie(userId: string, sessionSecret: string) {
  return {
    name: SESSION_COOKIE,
    value: await sealData(
      { userId },
      { password: sessionSecret, ttl: SESSION_TTL_S }
    ),
    ...HOST_COOKIE_ATTRIBUTES,
    maxAge: SESSION_TTL_S,
  }
}

export async function sessionUserId(
  seal: string | undefined,
  sessionSecret: string
) {
  if (seal === undefined) {
    return null
  }
  const session = SESSION.safeParse(
    await unsealData(seal, { password: sessionSecret, ttl: SESSION_TTL_S })
  )
  return session.success ? session.data.userId : null
}

export async function endSession() {
  ;(await cookies()).delete({
    name: SESSION_COOKIE,
    ...HOST_COOKIE_ATTRIBUTES,
  })
}
