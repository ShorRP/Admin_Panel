import type { Snowflake } from "discord-api-types/v10"
import { UserCheck } from "lucide-react"

import { Button } from "@/ui/button"
import { ReasonField } from "./reason-field"
import { CARD_BUTTON_CLASS } from "./sanction-form"
import type { SanctionResult } from "./sanction-result"

const REASON_ID = "ban-lift-reason"

export function BanLiftForm({
  userId,
  state,
  pending,
  action,
}: {
  userId: Snowflake
  state: SanctionResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const refused =
    state?.ok === false && state.change === "lift-ban" ? state : null
  return (
    <form action={action} className="flex flex-col gap-4.5">
      <input type="hidden" name="change" value="lift-ban" />
      <input type="hidden" name="userId" value={userId} />
      <ReasonField
        id={REASON_ID}
        label="Motif de la levée"
        defaultValue={refused?.reason ?? ""}
      />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className={CARD_BUTTON_CLASS}
      >
        <UserCheck aria-hidden data-icon="inline-start" />
        Lever le bannissement
      </Button>
    </form>
  )
}
