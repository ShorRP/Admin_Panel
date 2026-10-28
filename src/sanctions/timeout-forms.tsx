import type { Snowflake } from "discord-api-types/v10"
import { Timer, TimerOff } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import {
  CHOICE_CLASS,
  NATIVE_CONTROL_CLASS,
  SANCTION_ALERT_ID,
} from "./sanction-form"
import type { SanctionResult } from "./sanction-result"
import { TIMEOUT_DURATIONS } from "./timeout-durations"

const TIME_OUT_REASON_ID = "time-out-reason"

const LIFT_REASON_ID = "lift-reason"

export function TimeoutForms({
  userId,
  timedOutUntil,
  state,
  pending,
  action,
}: {
  userId: Snowflake
  timedOutUntil: Date | null
  state: SanctionResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const refusedTimeOut =
    state?.ok === false && state.change === "time-out" ? state : null
  const refusedLift =
    state?.ok === false && state.change === "lift" ? state : null
  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="change" value="time-out" />
        <input type="hidden" name="userId" value={userId} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Durée</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {TIMEOUT_DURATIONS.map(({ seconds, label }) => (
              <label key={seconds} className={CHOICE_CLASS}>
                <input
                  type="radio"
                  name="duration"
                  value={seconds}
                  defaultChecked={refusedTimeOut?.duration === seconds}
                  aria-describedby={SANCTION_ALERT_ID}
                  className={NATIVE_CONTROL_CLASS}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor={TIME_OUT_REASON_ID}>
            Motif de l’exclusion temporaire
          </Label>
          <Textarea
            id={TIME_OUT_REASON_ID}
            name="reason"
            defaultValue={refusedTimeOut?.reason ?? ""}
            aria-describedby={SANCTION_ALERT_ID}
          />
        </div>
        <label className={CHOICE_CLASS}>
          <input
            type="checkbox"
            name="notify"
            defaultChecked={refusedTimeOut?.notify ?? true}
            aria-describedby={SANCTION_ALERT_ID}
            className={NATIVE_CONTROL_CLASS}
          />
          Prévenir en message privé
        </label>
        <Button type="submit" disabled={pending} className="self-start">
          <Timer aria-hidden data-icon="inline-start" />
          Exclure temporairement
        </Button>
      </form>
      {timedOutUntil !== null && (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="change" value="lift" />
          <input type="hidden" name="userId" value={userId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={LIFT_REASON_ID}>Motif de la levée</Label>
            <Textarea
              id={LIFT_REASON_ID}
              name="reason"
              defaultValue={refusedLift?.reason ?? ""}
              aria-describedby={SANCTION_ALERT_ID}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            className="self-start"
          >
            <TimerOff aria-hidden data-icon="inline-start" />
            Lever l’exclusion temporaire
          </Button>
        </form>
      )}
    </div>
  )
}
