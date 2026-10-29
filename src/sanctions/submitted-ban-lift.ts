import type { Snowflake } from "discord-api-types/v10"

import { REASON, TYPED, USER_ID } from "./form-fields"
import type { BanLiftFields } from "./sanction-result"

export type SubmittedBanLift =
  | { ok: false; message: string; fields: BanLiftFields }
  | {
      ok: true
      fields: BanLiftFields
      userId: Snowflake | null
      reason: string
    }

export function submittedBanLift(formData: FormData): SubmittedBanLift {
  const fields: BanLiftFields = {
    change: "lift-ban",
    reason: TYPED.parse(formData.get("reason")),
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
