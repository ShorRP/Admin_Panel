import { cn } from "cn"
import { LoaderCircle, Power, PowerOff } from "lucide-react"

import { Button } from "@/ui/button"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { CONTROL_CLASSES } from "./link-rule-layout"
import type { LinkRuleStatus } from "./read-link-rule"
import type { WriteResult } from "./write-result"

const ALERT_ID = "link-rule-switch-error"

export function LinkRuleSwitchForm({
  status,
  state,
  pending,
  action,
}: {
  status: LinkRuleStatus
  state: WriteResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const turnsOn = status !== "enabled"
  return (
    <form action={action}>
      <input type="hidden" name="enabled" value={turnsOn ? "true" : "false"} />
      <Button
        type="submit"
        variant={turnsOn ? "default" : "outline"}
        disabled={pending}
        aria-describedby={ALERT_ID}
        className={cn(
          "w-full px-3.5 has-data-[icon=inline-start]:pl-3 sm:w-auto",
          CONTROL_CLASSES
        )}
      >
        {pending ? (
          <LoaderCircle
            aria-hidden
            data-icon="inline-start"
            className="motion-safe:animate-spin"
          />
        ) : turnsOn ? (
          <Power aria-hidden data-icon="inline-start" />
        ) : (
          <PowerOff aria-hidden data-icon="inline-start" />
        )}
        {pending
          ? turnsOn
            ? "Activation…"
            : "Coupure…"
          : turnsOn
            ? "Activer"
            : "Couper"}
      </Button>
      <p role="alert" id={ALERT_ID} className="text-sm not-empty:mt-2.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </form>
  )
}
