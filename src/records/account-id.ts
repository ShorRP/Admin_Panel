import { z } from "zod"

const LARGEST_SNOWFLAKE = BigInt("18446744073709551615")

export const ACCOUNT_ID = z
  .string()
  .refine((id) => /^\d{17,20}$/.test(id) && BigInt(id) <= LARGEST_SNOWFLAKE)
