import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { REASON, TYPED, USER_ID } from "./form-fields"
import type { TimeoutFields } from "./sanction-result"
import { TIMEOUT_DURATIONS } from "./timeout-durations"

const CHANGE = z.enum(["time-out", "lift"]).catch("time-out")

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
