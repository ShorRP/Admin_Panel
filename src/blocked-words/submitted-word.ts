import { z } from "zod"

import { MAX_WORD_LENGTH } from "./limits"

const TYPED = z.string().catch("")

const WORD = z
  .string()
  .trim()
  .min(1, { error: "Saisis un mot ou une expression." })
  .refine((word) => Array.from(word).length <= MAX_WORD_LENGTH, {
    error: `Raccourcis ce mot : AutoMod n’accepte pas plus de ${MAX_WORD_LENGTH} caractères.`,
  })

export type SubmittedWord =
  | { ok: true; typed: string; word: string }
  | { ok: false; typed: string; message: string }

export function submittedWord(formData: FormData): SubmittedWord {
  const typed = TYPED.parse(formData.get("word"))
  const parsed = WORD.safeParse(typed)
  if (!parsed.success) {
    return {
      ok: false,
      typed,
      message: parsed.error.issues.map(({ message }) => message).join(" "),
    }
  }
  return { ok: true, typed, word: parsed.data }
}
