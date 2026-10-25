import "server-only"

import { setTimeout as sleep } from "node:timers/promises"

import { DiscordError, type HttpMethod } from "./discord-error"
import type { DiscordRoute } from "./routes"

export type Fetch = typeof globalThis.fetch

export type DiscordRequest = {
  method: HttpMethod
  route: DiscordRoute
  url: string
  headers: Record<string, string>
  body?: string
}

export const API_BASE = "https://discord.com/api/v10"

const USER_AGENT = "DiscordBot (https://github.com/ShorRP/Admin_Panel, 0.0.0)"

const TIMEOUT_MS = 10_000

const MAX_RETRY_AFTER_S = 2

type ErrorBody = {
  code?: unknown
  message?: unknown
  retry_after?: unknown
  error?: unknown
  error_description?: unknown
}

export async function requestDiscordJson<T>(
  fetch: Fetch,
  request: DiscordRequest
): Promise<T> {
  const response = await requestDiscord(fetch, request)
  try {
    return await readJson<T>(response)
  } catch (error) {
    throw new DiscordError({
      method: request.method,
      route: request.route,
      status: error instanceof SyntaxError ? response.status : undefined,
    })
  }
}

export async function requestDiscord(fetch: Fetch, request: DiscordRequest) {
  const response = await send(fetch, request)
  if (response.ok) {
    return response
  }
  const error = await errorFrom(response, request)
  if (
    error.status !== 429 ||
    error.retryAfter === undefined ||
    error.retryAfter > MAX_RETRY_AFTER_S
  ) {
    throw error
  }
  await sleep(error.retryAfter * 1000)
  const retried = await send(fetch, request)
  if (retried.ok) {
    return retried
  }
  throw await errorFrom(retried, request)
}

async function send(fetch: Fetch, request: DiscordRequest) {
  try {
    return await fetch(request.url, {
      method: request.method,
      headers: { "User-Agent": USER_AGENT, ...request.headers },
      body: request.body ?? null,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new DiscordError({ method: request.method, route: request.route })
  }
}

async function errorFrom(response: Response, request: DiscordRequest) {
  const body = await readJson<ErrorBody>(response).catch(() => undefined)
  return new DiscordError({
    method: request.method,
    route: request.route,
    status: response.status,
    code: typeof body?.code === "number" ? body.code : undefined,
    discordMessage: messageOf(body),
    retryAfter:
      typeof body?.retry_after === "number" ? body.retry_after : undefined,
  })
}

function messageOf(body: ErrorBody | undefined) {
  if (typeof body?.message === "string") {
    return body.message
  }
  if (typeof body?.error !== "string") {
    return undefined
  }
  return typeof body.error_description === "string"
    ? `${body.error}: ${body.error_description}`
    : body.error
}

async function readJson<T>(response: Response): Promise<T> {
  return await response.json()
}
