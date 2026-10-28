import { z } from "zod"

import { ACCOUNT_ID } from "@/records/account-id"

const MAX_REASON_LENGTH = 400

export const TYPED = z.string().catch("")

export const USER_ID = ACCOUNT_ID.nullable().catch(null)

export const REASON = z
  .string()
  .trim()
  .min(1, { error: "Saisis un motif." })
  .refine((reason) => Array.from(reason).length <= MAX_REASON_LENGTH, {
    error: `Raccourcis ce motif : le panel n’en accepte pas plus de ${MAX_REASON_LENGTH} caractères.`,
  })
