import type { Snowflake } from "discord-api-types/v10"
import { Hammer } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import { BAN_MESSAGE_DELETIONS } from "./ban-message-deletions"
import {
  CHOICE_CLASS,
  NATIVE_CONTROL_CLASS,
  SANCTION_ALERT_ID,
} from "./sanction-form"
import type { SanctionResult } from "./sanction-result"

const REASON_ID = "ban-reason"

const NO_MESSAGE_DELETED = "0"

export function BanForm({
  userId,
  notifies,
  state,
  pending,
  action,
}: {
  userId: Snowflake
  notifies: boolean
  state: SanctionResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const refused = state?.ok === false && state.change === "ban" ? state : null
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="change" value="ban" />
      <input type="hidden" name="userId" value={userId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          Messages à supprimer
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {BAN_MESSAGE_DELETIONS.map(({ seconds, label }) => (
            <label key={seconds} className={CHOICE_CLASS}>
              <input
                type="radio"
                name="deleteMessages"
                value={seconds}
                defaultChecked={
                  (refused?.deleteMessages ?? NO_MESSAGE_DELETED) === seconds
                }
                aria-describedby={SANCTION_ALERT_ID}
                className={NATIVE_CONTROL_CLASS}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor={REASON_ID}>Motif du bannissement</Label>
        <Textarea
          id={REASON_ID}
          name="reason"
          defaultValue={refused?.reason ?? ""}
          aria-describedby={SANCTION_ALERT_ID}
        />
      </div>
      {notifies && (
        <label className={CHOICE_CLASS}>
          <input
            type="checkbox"
            name="notify"
            defaultChecked={refused?.notify ?? true}
            aria-describedby={SANCTION_ALERT_ID}
            className={NATIVE_CONTROL_CLASS}
          />
          Prévenir en message privé
        </label>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        <Hammer aria-hidden data-icon="inline-start" />
        Bannir
      </Button>
    </form>
  )
}
