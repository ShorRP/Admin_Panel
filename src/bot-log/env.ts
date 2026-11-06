import { z } from "zod"

const SNOWFLAKE = z.string().regex(/^\d{17,20}$/)

const OPTIONAL_SNOWFLAKE = z.preprocess(
  (value) => (value === "" ? undefined : value),
  SNOWFLAKE.optional()
)

const BOT_LOG_ENV = z
  .object({ BOT_LOG_CHANNEL_ID: OPTIONAL_SNOWFLAKE })
  .transform((env) => ({
    botLog:
      env.BOT_LOG_CHANNEL_ID === undefined
        ? null
        : { channelId: env.BOT_LOG_CHANNEL_ID },
  }))

type Env = Record<string, string | undefined>

export type BotLogEnv = z.infer<typeof BOT_LOG_ENV>

export function parseBotLogEnv(env: Env): BotLogEnv {
  const result = BOT_LOG_ENV.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
