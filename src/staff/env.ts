import { z } from "zod"

const SNOWFLAKE = z.string().regex(/^\d{17,20}$/)

const SNOWFLAKES = z
  .string()
  .transform((list) => list.split(",").map((id) => id.trim()))
  .pipe(z.array(SNOWFLAKE))

const STAFF_ENV = z
  .object({
    STAFF_ROLE_ID: SNOWFLAKE,
    MODERATION_ROLE_IDS: SNOWFLAKES,
    BAN_ROLE_IDS: SNOWFLAKES,
    SESSION_SECRET: z.string().min(32),
  })
  .transform((env) => ({
    staffRoleId: env.STAFF_ROLE_ID,
    moderationRoleIds: env.MODERATION_ROLE_IDS,
    banRoleIds: env.BAN_ROLE_IDS,
    sessionSecret: env.SESSION_SECRET,
  }))

type Env = Record<string, string | undefined>

export type StaffEnv = z.infer<typeof STAFF_ENV>

export function parseStaffEnv(env: Env): StaffEnv {
  const result = STAFF_ENV.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
