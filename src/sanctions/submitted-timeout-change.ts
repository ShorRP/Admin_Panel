import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { ACCOUNT_ID } from "@/records/account-id"
import { TIMEOUT_DURATIONS } from "./timeout-durations"
import type { TimeoutFields } from "./timeout-result"

const MAX_REASON_LENGTH = 400

const TYPED = z.string().catch("")

const CHANGE = z.enum(["time-out", "lift"]).catch("time-out")

const USER_ID = ACCOUNT_ID.nullable().catch(null)

const REASON = z
  .string()
  .trim()
  .min(1, { error: "Saisis un motif." })
  .refine((reason) => Array.from(reason).length <= MAX_REASON_LENGTH, {
    error: `Raccourcis ce motif : le panel n’en accepte pas plus de ${MAX_REASON_LENGTH} caractères.`,
  })

const DURATION = z.enum(
  TIMEOUT_DURATIONS.map(({ seconds }) => seconds),
  {
    error: "Choisis une durée.",
  }
)

export type SubmittedTimeoutChange =
  | { ok: false; message: string; fields: TimeoutFields }
  | {
      ok: true
      fields: TimeoutFields
      userId: Snowflake | null
      reason: string
      seconds: number | null
    }

export function submittedTimeoutChange(
  formData: FormData
): SubmittedTimeoutChange {
  const reason = TYPED.parse(formData.get("reason"))
  const fields: TimeoutFields =
    CHANGE.parse(formData.get("change")) === "lift"
      ? { change: "lift", reason }
      : {
          change: "time-out",
          reason,
          duration: TYPED.parse(formData.get("duration")),
          notify: formData.get("notify") === "on",
        }
  const parsedReason = REASON.safeParse(reason)
  const parsedDuration =
    fields.change === "lift" ? null : DURATION.safeParse(fields.duration)
  const messages = [
    ...(parsedReason.error?.issues ?? []),
    ...(parsedDuration?.error?.issues ?? []),
  ].map(({ message }) => message)
  if (!parsedReason.success || parsedDuration?.success === false) {
    return { ok: false, message: messages.join(" "), fields }
  }
  return {
    ok: true,
    fields,
    userId: USER_ID.parse(formData.get("userId")),
    reason: parsedReason.data,
    seconds: parsedDuration === null ? null : Number(parsedDuration.data),
  }
}
