import type { Snowflake } from "discord-api-types/v10"
import { UserCheck } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import { SANCTION_ALERT_ID } from "./sanction-form"
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
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="change" value="lift-ban" />
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={REASON_ID}>Motif de la levée</Label>
        <Textarea
          id={REASON_ID}
          name="reason"
          defaultValue={refused?.reason ?? ""}
          aria-describedby={SANCTION_ALERT_ID}
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="self-start"
      >
        <UserCheck aria-hidden data-icon="inline-start" />
        Lever le bannissement
      </Button>
    </form>
  )
}
