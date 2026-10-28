import type { Snowflake } from "discord-api-types/v10"
import { Timer, TimerOff } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import { WriteResultMessage } from "@/ui/write-result-message"
import { TIMEOUT_DURATIONS } from "./timeout-durations"
import type { TimeoutResult } from "./timeout-result"

const ALERT_ID = "timeout-error"

const TIME_OUT_REASON_ID = "time-out-reason"

const LIFT_REASON_ID = "lift-reason"

const CHOICE_CLASS = "flex items-center gap-2 text-sm"

const NATIVE_CONTROL_CLASS = "size-4 shrink-0 accent-primary"

export function TimeoutForms({
  userId,
  timedOutUntil,
  state,
  pending,
  action,
}: {
  userId: Snowflake
  timedOutUntil: Date | null
  state: TimeoutResult | null
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
                  aria-describedby={ALERT_ID}
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
            aria-describedby={ALERT_ID}
          />
        </div>
        <label className={CHOICE_CLASS}>
          <input
            type="checkbox"
            name="notify"
            defaultChecked={refusedTimeOut?.notify ?? true}
            aria-describedby={ALERT_ID}
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
              aria-describedby={ALERT_ID}
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
      <p role="status" className="text-sm">
        {pending
          ? "Envoi en cours…"
          : state?.ok === true && <WriteResultMessage result={state} />}
      </p>
      <p role="alert" id={ALERT_ID} className="text-sm">
        {state?.ok === false && <WriteResultMessage result={state} />}
      </p>
    </div>
  )
}
