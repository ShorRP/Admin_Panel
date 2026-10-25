import { z } from "zod"

const WEBHOOK_URL = z.url({ abort: true }).refine((value) => {
  const url = new URL(value)
  return (
    url.origin === "https://discord.com" &&
    url.pathname.startsWith("/api/webhooks/")
  )
}, "Must be a webhook URL under https://discord.com/api/webhooks/")

const MONITORING_ENV = z
  .object({
    ALERT_WEBHOOK_URL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      WEBHOOK_URL.optional()
    ),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  })
  .refine(
    (env) =>
      env.VERCEL_ENV !== "production" || env.ALERT_WEBHOOK_URL !== undefined,
    { path: ["ALERT_WEBHOOK_URL"], message: "Required in production" }
  )
  .transform((env) => ({
    alertWebhookUrl: env.ALERT_WEBHOOK_URL,
    environment: env.VERCEL_ENV ?? ("local" as const),
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  }))

type Env = Record<string, string | undefined>

export type MonitoringEnv = z.infer<typeof MONITORING_ENV>

export function parseMonitoringEnv(env: Env): MonitoringEnv {
  const result = MONITORING_ENV.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
