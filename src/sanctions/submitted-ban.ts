import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { BAN_MESSAGE_DELETIONS } from "./ban-message-deletions"
import { REASON, TYPED, USER_ID } from "./form-fields"
import type { BanFields } from "./sanction-result"

const DELETE_MESSAGES = z.enum(
  BAN_MESSAGE_DELETIONS.map(({ seconds }) => seconds),
  { error: "Choisis les messages à supprimer." }
)

export type SubmittedBan =
  | { ok: false; message: string; fields: BanFields }
  | {
      ok: true
      fields: BanFields
      userId: Snowflake | null
      reason: string
      deleteMessageSeconds: number
    }

export function submittedBan(formData: FormData): SubmittedBan {
  const fields: BanFields = {
    change: "ban",
    reason: TYPED.parse(formData.get("reason")),
    deleteMessages: TYPED.parse(formData.get("deleteMessages")),
    notify: formData.get("notify") === "on",
  }
  const reason = REASON.safeParse(fields.reason)
  const deleteMessages = DELETE_MESSAGES.safeParse(fields.deleteMessages)
  if (!reason.success || !deleteMessages.success) {
    return {
      ok: false,
      message: [
        ...(reason.error?.issues ?? []),
        ...(deleteMessages.error?.issues ?? []),
      ]
        .map(({ message }) => message)
        .join(" "),
      fields,
    }
  }
  return {
    ok: true,
    fields,
    userId: USER_ID.parse(formData.get("userId")),
    reason: reason.data,
    deleteMessageSeconds: Number(deleteMessages.data),
  }
}
