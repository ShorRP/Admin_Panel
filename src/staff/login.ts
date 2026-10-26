import "server-only"

import { randomBytes, timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import type { DiscordApi } from "@/discord/discord-api"
import type { DiscordOAuth } from "@/discord/discord-oauth"
import type { Monitor } from "@/monitoring/monitor"
import { isPanelError } from "@/monitoring/panel-error"
import { parseStaffEnv } from "./env"
import { HOST_COOKIE_ATTRIBUTES } from "./host-cookie"
import { sessionCookie } from "./session"
import { findStaffMember } from "./staff-member"

const STATE_COOKIE = "__Host-oauth-state"

const STATE_TTL_S = 10 * 60

const RANDOM_BYTES = 32

const OPTIONAL_TEXT = z.string().min(1).optional().catch(undefined)

const CALLBACK_QUERY = z.object({
  code: OPTIONAL_TEXT,
  state: OPTIONAL_TEXT,
})

export function startLogin(oauth: DiscordOAuth) {
  const state = randomBytes(RANDOM_BYTES).toString("base64url")
  const codeVerifier = randomBytes(RANDOM_BYTES).toString("base64url")
  const response = NextResponse.redirect(
    oauth.authorizationUrl(state, codeVerifier)
  )
  response.cookies.set({
    name: STATE_COOKIE,
    value: `${state}.${codeVerifier}`,
    ...HOST_COOKIE_ATTRIBUTES,
    maxAge: STATE_TTL_S,
  })
  return response
}

export type LoginClients = {
  discord: () => DiscordApi
  oauth: () => DiscordOAuth
}

export async function completeLogin(
  request: NextRequest,
  monitor: Monitor,
  clients: LoginClients
) {
  const response = await callbackRedirect(request, monitor, clients)
  response.cookies.delete({ name: STATE_COOKIE, ...HOST_COOKIE_ATTRIBUTES })
  return response
}

async function callbackRedirect(
  request: NextRequest,
  monitor: Monitor,
  clients: LoginClients
) {
  const { code, state } = CALLBACK_QUERY.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  const started = startedLoginOf(request.cookies.get(STATE_COOKIE)?.value)
  if (started === null || !sameState(state, started.state)) {
    monitor.warn(new Error("The login's state is missing or differs"))
    return redirectTo(request, "/login/failed")
  }
  if (code === undefined) {
    return redirectTo(request, "/login/failed")
  }
  try {
    const { staffRoleId, sessionSecret } = parseStaffEnv(process.env)
    const discord = clients.discord()
    const oauth = clients.oauth()
    const { access_token } = await oauth.exchangeCode(
      code,
      started.codeVerifier
    )
    const user = await oauth.getCurrentUser(access_token)
    const staffMember = await findStaffMember(discord, staffRoleId, user.id)
    if (staffMember === null) {
      return redirectTo(request, "/login/refused")
    }
    const response = redirectTo(request, "/")
    response.cookies.set(await sessionCookie(staffMember.id, sessionSecret))
    return response
  } catch (error) {
    if (isPanelError(error)) {
      monitor.error(error)
    } else {
      monitor.warn(error)
    }
    return redirectTo(request, "/login/failed")
  }
}

function startedLoginOf(stateCookie: string | undefined) {
  const [state, codeVerifier, ...rest] = stateCookie?.split(".") ?? []
  if (!state || !codeVerifier || rest.length > 0) {
    return null
  }
  return { state, codeVerifier }
}

function sameState(state: string | undefined, expected: string) {
  if (state === undefined) {
    return false
  }
  const actual = Buffer.from(state)
  const wanted = Buffer.from(expected)
  return actual.length === wanted.length && timingSafeEqual(actual, wanted)
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}
