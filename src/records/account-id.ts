import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

export const ACCOUNT_ID = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)

const MENTION = /^<@!?(\d+)>$/

export function accountIdOf(text: string): Snowflake | null {
  const id = ACCOUNT_ID.safeParse(MENTION.exec(text)?.[1] ?? text)
  return id.success ? id.data : null
}
