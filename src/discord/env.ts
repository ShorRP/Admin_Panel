import { z } from "zod"

const SNOWFLAKE = z.string().regex(/^\d{17,20}$/)

const REDIRECT_URI = z.url({ abort: true }).refine((value) => {
  const url = new URL(value)
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" && url.hostname === "localhost")
  )
}, "Must use https:, or http: on localhost")

const DISCORD_API_ENV = z
  .object({
    DISCORD_BOT_TOKEN: z.string().min(1),
    DISCORD_GUILD_ID: SNOWFLAKE,
  })
  .transform((env) => ({
    botToken: env.DISCORD_BOT_TOKEN,
    guildId: env.DISCORD_GUILD_ID,
  }))

const DISCORD_OAUTH_ENV = z
  .object({
    DISCORD_CLIENT_ID: SNOWFLAKE,
    DISCORD_CLIENT_SECRET: z.string().min(1),
    DISCORD_REDIRECT_URI: REDIRECT_URI,
  })
  .transform((env) => ({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    redirectUri: env.DISCORD_REDIRECT_URI,
  }))

const TEST_PROXY_ENV = z
  .object({
    VERCEL: z.string().optional(),
    E2E_TEST_PROXY: z.literal("1").optional(),
  })
  .refine((env) => !env.VERCEL || env.E2E_TEST_PROXY === undefined, {
    path: ["E2E_TEST_PROXY"],
    message: "Must be unset on Vercel",
  })
  .transform((env) => ({ testProxy: env.E2E_TEST_PROXY === "1" }))

type Env = Record<string, string | undefined>

export type DiscordApiEnv = z.infer<typeof DISCORD_API_ENV>

export type DiscordOAuthEnv = z.infer<typeof DISCORD_OAUTH_ENV>

export type TestProxyEnv = z.infer<typeof TEST_PROXY_ENV>

export function parseDiscordApiEnv(env: Env): DiscordApiEnv {
  return parse(DISCORD_API_ENV, env)
}

export function parseDiscordOAuthEnv(env: Env): DiscordOAuthEnv {
  return parse(DISCORD_OAUTH_ENV, env)
}

export function parseTestProxyEnv(env: Env): TestProxyEnv {
  return parse(TEST_PROXY_ENV, env)
}

function parse<T>(schema: z.ZodType<T>, env: Env): T {
  const result = schema.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
