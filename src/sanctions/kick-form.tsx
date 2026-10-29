import { cn } from "cn"
import type { Snowflake } from "discord-api-types/v10"
import { UserX } from "lucide-react"

import { Button } from "@/ui/button"
import { NotifyCheckbox, ReasonField } from "./sanction-fields"
import {
  REASON_PLACEHOLDER,
  RED_BUTTON_CLASS,
  SENTENCE_CLASS,
  SUBMIT_CLASS,
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
    <form action={action} className="flex flex-col gap-4.5">
      <input type="hidden" name="change" value="kick" />
      <input type="hidden" name="userId" value={userId} />
      <p className={SENTENCE_CLASS}>
        Le compte quitte le serveur Discord et peut le rejoindre à nouveau par
        une invitation.
      </p>
      <ReasonField
        id={REASON_ID}
        label="Motif de l’expulsion"
        defaultValue={refused?.reason ?? ""}
        placeholder={REASON_PLACEHOLDER}
      />
      <NotifyCheckbox defaultChecked={refused?.notify ?? true} />
      <Button
        type="submit"
        disabled={pending}
        className={cn(SUBMIT_CLASS, RED_BUTTON_CLASS)}
      >
        <UserX aria-hidden data-icon="inline-start" />
        Expulser
      </Button>
    </form>
  )
}
