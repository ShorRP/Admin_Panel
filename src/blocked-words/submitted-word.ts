import { z } from "zod"

import {
  BLOCKED_WORD_ACTION_IDS,
  blockedWordAction,
  type BlockedWordAction,
} from "./blocked-word-action"
import { MAX_WORD_LENGTH } from "./limits"
import type { WordFields } from "./write-result"

const TYPED = z.string().catch("")

const WORD = z
  .string()
  .trim()
  .min(1, { error: "Saisis un mot ou une expression." })
  .refine((word) => Array.from(word).length <= MAX_WORD_LENGTH, {
    error: `Raccourcis ce mot : AutoMod n’accepte pas plus de ${MAX_WORD_LENGTH} caractères.`,
  })

const ACTION = z.enum(BLOCKED_WORD_ACTION_IDS, {
  error: "Choisis une action.",
})

export type SubmittedWord =
  | { ok: true; typed: string; word: string }
  | { ok: false; typed: string; message: string }

export type SubmittedBlockedWord =
  | { ok: true; fields: WordFields; word: string; action: BlockedWordAction }
  | { ok: false; fields: WordFields; message: string }

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

export function submittedBlockedWord(formData: FormData): SubmittedBlockedWord {
  const word = submittedWord(formData)
  const typedAction = TYPED.parse(formData.get("action"))
  const fields = { word: word.typed, action: typedAction }
  const action = ACTION.safeParse(typedAction)
  if (word.ok && action.success) {
    return {
      ok: true,
      fields,
      word: word.word,
      action: blockedWordAction(action.data),
    }
  }
  return {
    ok: false,
    fields,
    message: [
      ...(word.ok ? [] : [word.message]),
      ...(action.success
        ? []
        : action.error.issues.map(({ message }) => message)),
    ].join(" "),
  }
}
