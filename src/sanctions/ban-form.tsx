import type { Snowflake } from "discord-api-types/v10"
import { Hammer } from "lucide-react"

import { BAN_MESSAGE_DELETIONS } from "./ban-message-deletions"
import { NotifyCheckbox } from "./notify-checkbox"
import { ReasonField } from "./reason-field"
import type { Confirmation } from "./sanction-confirmation"
import { SanctionConfirmationDialog } from "./sanction-confirmation-dialog"
import {
  CHOICE_CLASS,
  LEGEND_CLASS,
  NATIVE_CONTROL_CLASS,
  SANCTION_ALERT_ID,
  SENTENCE_CLASS,
} from "./sanction-form"
import type { SanctionResult } from "./sanction-result"

const FORM_ID = "ban-form"

const REASON_ID = "ban-reason"

const NO_MESSAGE_DELETED = "0"

export function BanForm({
  userId,
  name,
  standing,
  state,
  pending,
  action,
}: {
  userId: Snowflake
  name: string
  standing: "member" | "absent"
  state: SanctionResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const refused = state?.ok === false && state.change === "ban" ? state : null
  return (
    <form id={FORM_ID} action={action} className="flex flex-col gap-4.5">
      <input type="hidden" name="change" value="ban" />
      <input type="hidden" name="userId" value={userId} />
      <p className={SENTENCE_CLASS}>
        {standing === "member"
          ? "Le compte quitte le serveur Discord et ne peut plus le rejoindre tant que le bannissement n’est pas levé."
          : "Ce compte n’est pas membre du serveur Discord : seul un bannissement reste possible, pour l’empêcher d’y revenir."}
      </p>
      <fieldset>
        <legend className={LEGEND_CLASS}>Messages à supprimer</legend>
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
      <ReasonField
        id={REASON_ID}
        label="Motif du bannissement"
        defaultValue={refused?.reason ?? ""}
        readByMember={standing === "member"}
      />
      {standing === "member" && (
        <NotifyCheckbox defaultChecked={refused?.notify ?? true} />
      )}
      <SanctionConfirmationDialog
        confirmation={banConfirmation(name)}
        pending={pending}
      />
    </form>
  )
}

export function banConfirmation(name: string): Confirmation {
  return {
    formId: FORM_ID,
    label: "Bannir",
    icon: Hammer,
    title: `Bannir ${name} ?`,
    description:
      "Le compte ne pourra plus rejoindre le serveur Discord tant que le staff ne lève pas le bannissement.",
  }
}
