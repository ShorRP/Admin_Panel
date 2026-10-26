import { z } from "zod"

const STAFF_ENV = z
  .object({
    STAFF_ROLE_ID: z.string().regex(/^\d{17,20}$/),
    SESSION_SECRET: z.string().min(32),
  })
  .transform((env) => ({
    staffRoleId: env.STAFF_ROLE_ID,
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
