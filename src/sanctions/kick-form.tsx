import type { Snowflake } from "discord-api-types/v10"
import { UserX } from "lucide-react"

import { NotifyCheckbox } from "./notify-checkbox"
import { ReasonField } from "./reason-field"
import {
  ConfirmedSanction,
  SanctionConfirmation,
} from "./sanction-confirmation"
import { SENTENCE_CLASS } from "./sanction-form"
import type { SanctionResult } from "./sanction-result"

const FORM_ID = "kick-form"

const REASON_ID = "kick-reason"

export function KickForm({
  userId,
  name,
  state,
  pending,
  action,
}: {
  userId: Snowflake
  name: string
  state: SanctionResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const refused = state?.ok === false && state.change === "kick" ? state : null
  return (
    <form id={FORM_ID} action={action} className="flex flex-col gap-4.5">
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
        readByMember
      />
      <NotifyCheckbox defaultChecked={refused?.notify ?? true} />
      <ConfirmedSanction label="Expulser" icon={UserX} pending={pending}>
        <KickConfirmation name={name} />
      </ConfirmedSanction>
    </form>
  )
}

export function KickConfirmation({ name }: { name: string }) {
  return (
    <SanctionConfirmation
      formId={FORM_ID}
      title={`Expulser ${name} ?`}
      description="Le compte quitte le serveur Discord tout de suite. Il pourra revenir par une invitation."
      label="Expulser"
      icon={UserX}
    />
  )
}
