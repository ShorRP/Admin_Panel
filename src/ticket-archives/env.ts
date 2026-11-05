import { z } from "zod"

const SNOWFLAKE = z.string().regex(/^\d{17,20}$/)

const OPTIONAL_SNOWFLAKE = z.preprocess(
  (value) => (value === "" ? undefined : value),
  SNOWFLAKE.optional()
)

const TICKET_ARCHIVES_ENV = z
  .object({
    TICKET_ARCHIVES_CHANNEL_ID: OPTIONAL_SNOWFLAKE,
    TICKET_CATEGORY_ID: OPTIONAL_SNOWFLAKE,
  })
  .transform((env) => ({
    archivesChannelId: env.TICKET_ARCHIVES_CHANNEL_ID ?? null,
    ticketsCategoryId: env.TICKET_CATEGORY_ID ?? null,
  }))

type Env = Record<string, string | undefined>

export type TicketArchivesEnv = z.infer<typeof TICKET_ARCHIVES_ENV>

export function parseTicketArchivesEnv(env: Env): TicketArchivesEnv {
  const result = TICKET_ARCHIVES_ENV.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
