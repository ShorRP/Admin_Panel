import type { Snowflake } from "discord-api-types/v10"
import { UserX } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import {
  CHOICE_CLASS,
  NATIVE_CONTROL_CLASS,
  SANCTION_ALERT_ID,
} from "./sanction-form"
import type { SanctionResult } from "./sanction-result"

const REASON_ID = "kick-reason"

export function KickForm({
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
  const refused = state?.ok === false && state.change === "kick" ? state : null
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="change" value="kick" />
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={REASON_ID}>Motif de l’expulsion</Label>
        <Textarea
          id={REASON_ID}
          name="reason"
          defaultValue={refused?.reason ?? ""}
          aria-describedby={SANCTION_ALERT_ID}
        />
      </div>
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
      <Button type="submit" disabled={pending} className="self-start">
        <UserX aria-hidden data-icon="inline-start" />
        Expulser
      </Button>
    </form>
  )
}
