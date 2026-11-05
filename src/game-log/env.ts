import { z } from "zod"

const SNOWFLAKE = z.string().regex(/^\d{17,20}$/)

const OPTIONAL_SNOWFLAKE = z.preprocess(
  (value) => (value === "" ? undefined : value),
  SNOWFLAKE.optional()
)

const GAME_LOG_ENV = z
  .object({
    GAME_LOG_CHANNEL_ID: OPTIONAL_SNOWFLAKE,
    GAME_LOG_WEBHOOK_ID: OPTIONAL_SNOWFLAKE,
  })
  .superRefine((env, context) => {
    if (
      env.GAME_LOG_CHANNEL_ID !== undefined &&
      env.GAME_LOG_WEBHOOK_ID === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["GAME_LOG_WEBHOOK_ID"],
        message: "Required when GAME_LOG_CHANNEL_ID is set",
      })
    }
    if (
      env.GAME_LOG_WEBHOOK_ID !== undefined &&
      env.GAME_LOG_CHANNEL_ID === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["GAME_LOG_CHANNEL_ID"],
        message: "Required when GAME_LOG_WEBHOOK_ID is set",
      })
    }
  })
  .transform((env) => ({
    gameLog:
      env.GAME_LOG_CHANNEL_ID === undefined ||
      env.GAME_LOG_WEBHOOK_ID === undefined
        ? null
        : {
            channelId: env.GAME_LOG_CHANNEL_ID,
            webhookId: env.GAME_LOG_WEBHOOK_ID,
          },
  }))

type Env = Record<string, string | undefined>

export type GameLogEnv = z.infer<typeof GAME_LOG_ENV>

export function parseGameLogEnv(env: Env): GameLogEnv {
  const result = GAME_LOG_ENV.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
