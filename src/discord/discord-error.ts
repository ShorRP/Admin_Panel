import type { DiscordRoute } from "./routes"

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export type DiscordErrorDetails = {
  method: HttpMethod
  route: DiscordRoute
  status?: number | undefined
  code?: number | undefined
  discordMessage?: string | undefined
  retryAfter?: number | undefined
}

export class DiscordError extends Error {
  readonly method: HttpMethod
  readonly route: DiscordRoute
  readonly status: number | undefined
  readonly code: number | undefined
  readonly discordMessage: string | undefined
  readonly retryAfter: number | undefined
  readonly unavailable: boolean

  constructor(details: DiscordErrorDetails) {
    super(messageFor(details))
    this.name = "DiscordError"
    this.method = details.method
    this.route = details.route
    this.status = details.status
    this.code = details.code
    this.discordMessage = details.discordMessage
    this.retryAfter = details.retryAfter
    this.unavailable =
      details.status === undefined ||
      details.status === 429 ||
      details.status >= 500
  }
}

function messageFor({
  method,
  route,
  status,
  code,
  discordMessage,
}: DiscordErrorDetails) {
  const answer = status === undefined ? "got no response" : `answered ${status}`
  const detail = [code, discordMessage].filter((part) => part !== undefined)
  return detail.length === 0
    ? `${method} ${route} ${answer}`
    : `${method} ${route} ${answer}: ${detail.join(" ")}`
}
