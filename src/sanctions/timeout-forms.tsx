import type { Snowflake } from "discord-api-types/v10"
import { Timer, TimerOff } from "lucide-react"

import { Button } from "@/ui/button"
import { ParisTime } from "@/ui/paris-time"
import { NotifyCheckbox } from "./notify-checkbox"
import { ReasonField } from "./reason-field"
import {
  CARD_BUTTON_CLASS,
  LEGEND_CLASS,
  SANCTION_ALERT_ID,
} from "./sanction-form"
import { SanctionNotice } from "./sanction-notice"
import type { SanctionResult } from "./sanction-result"
import {
  DEFAULT_TIMEOUT_DURATION,
  TIMEOUT_DURATIONS,
} from "./timeout-durations"

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
    <div className="flex flex-col gap-4.5">
      {timedOutUntil !== null && (
        <SanctionNotice
          kind="timeout"
          title="Exclusion temporaire en cours"
          detail={
            <>
              Jusqu’au <ParisTime date={timedOutUntil} />
            </>
          }
        >
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="change" value="lift" />
            <input type="hidden" name="userId" value={userId} />
            <ReasonField
              id={LIFT_REASON_ID}
              label="Motif de la levée"
              defaultValue={refusedLift?.reason ?? ""}
              className="bg-card dark:bg-card"
            />
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
        </SanctionNotice>
      )}
      <form action={action} className="flex flex-col gap-4.5">
        <input type="hidden" name="change" value="time-out" />
        <input type="hidden" name="userId" value={userId} />
        <fieldset>
          <legend className={LEGEND_CLASS}>Durée</legend>
          <div className="flex flex-wrap gap-1.5">
            {TIMEOUT_DURATIONS.map(({ seconds, label }) => (
              <label
                key={seconds}
                className="relative inline-flex h-7.5 items-center rounded-lg border border-input px-2.75 text-[0.78125rem] whitespace-nowrap has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 dark:bg-input/30 dark:has-checked:bg-primary"
              >
                <input
                  type="radio"
                  name="duration"
                  value={seconds}
                  defaultChecked={
                    (refusedTimeOut?.duration ?? DEFAULT_TIMEOUT_DURATION) ===
                    seconds
                  }
                  aria-describedby={SANCTION_ALERT_ID}
                  className="absolute inset-0 size-full cursor-pointer appearance-none rounded-[inherit] outline-none"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <ReasonField
          id={TIME_OUT_REASON_ID}
          label="Motif de l’exclusion temporaire"
          defaultValue={refusedTimeOut?.reason ?? ""}
          readByMember
        />
        <NotifyCheckbox defaultChecked={refusedTimeOut?.notify ?? true} />
        <Button type="submit" disabled={pending} className={CARD_BUTTON_CLASS}>
          <Timer aria-hidden data-icon="inline-start" />
          Exclure temporairement
        </Button>
      </form>
    </div>
  )
}
