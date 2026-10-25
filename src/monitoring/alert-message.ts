import type { Instrumentation } from "next"
import type { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/v10"

import type { MonitoringEnv } from "./env"

export type AlertContext = Pick<
  Parameters<Instrumentation.onRequestError>[2],
  "routeType" | "routePath"
>

const CONTENT_LIMIT = 2_000

export function alertMessage(
  env: MonitoringEnv,
  error: unknown,
  context: AlertContext | undefined
): RESTPostAPIWebhookWithTokenJSONBody {
  const head = headLines(env, error, context)
  const lines = errorLines(error)
  const room = CONTENT_LIMIT - `${head}\n\`\`\`\n\n\`\`\``.length
  const cut = lines.length <= room ? lines : `${lines.slice(0, room - 1)}…`
  return {
    content: `${head}\n\`\`\`\n${cut}\n\`\`\``,
    allowed_mentions: { parse: [] },
  }
}

function headLines(
  env: MonitoringEnv,
  error: unknown,
  context: AlertContext | undefined
) {
  const title =
    env.commit === undefined
      ? `**Panel error**, ${env.environment}`
      : `**Panel error**, ${env.environment}, commit ${env.commit}`
  const digest = digestOf(error)
  const where = [
    ...(context === undefined
      ? []
      : [`${context.routeType} ${context.routePath}`]),
    ...(digest === undefined ? [] : [`digest ${digest}`]),
  ]
  return where.length === 0 ? title : `${title}\n${where.join(", ")}`
}

function digestOf(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
    ? error.digest
    : undefined
}

function errorLines(error: unknown) {
  if (!(error instanceof Error)) {
    return `Thrown ${typeof error}`
  }
  const frames = (error.stack ?? "")
    .split("\n")
    .filter((line) => /^\s*at /.test(line))
  return [`${error.name}: ${error.message}`, ...frames].join("\n")
}
