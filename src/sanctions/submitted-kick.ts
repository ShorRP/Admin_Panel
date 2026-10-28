import type { Snowflake } from "discord-api-types/v10"

import { REASON, TYPED, USER_ID } from "./form-fields"
import type { KickFields } from "./sanction-result"

export type SubmittedKick =
  | { ok: false; message: string; fields: KickFields }
  | { ok: true; fields: KickFields; userId: Snowflake | null; reason: string }

export function submittedKick(formData: FormData): SubmittedKick {
  const fields: KickFields = {
    change: "kick",
    reason: TYPED.parse(formData.get("reason")),
    notify: formData.get("notify") === "on",
  }
  const reason = REASON.safeParse(fields.reason)
  if (!reason.success) {
    return {
      ok: false,
      message: reason.error.issues.map(({ message }) => message).join(" "),
      fields,
    }
  }
  return {
    ok: true,
    fields,
    userId: USER_ID.parse(formData.get("userId")),
    reason: reason.data,
  }
}
