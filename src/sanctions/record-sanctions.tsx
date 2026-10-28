import type { ReactNode } from "react"

import { WriteResultMessage } from "@/ui/write-result-message"
import { KickForm } from "./kick-form"
import { SANCTION_ALERT_ID } from "./sanction-form"
import type { SanctionOptions } from "./sanction-options"
import type { SanctionResult } from "./sanction-result"
import { TimeoutForms } from "./timeout-forms"

const HEADING_ID = "sanctions"

export function RecordSanctions({
  options,
  state,
  pending,
  action,
}: {
  options: SanctionOptions
  state: SanctionResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      hidden={options.kind === "none" && state === null}
      className="flex flex-col gap-6"
    >
      <h2 id={HEADING_ID} className="font-heading text-lg font-medium">
        Sanctions
      </h2>
      {options.kind === "refused" && <p>{options.reason}</p>}
      {options.kind === "open" && (
        <>
          <Sanction
            headingId="sanctions-timeout"
            heading="Exclusion temporaire"
          >
            {options.timeout.kind === "refused" ? (
              <p>{options.timeout.reason}</p>
            ) : (
              <TimeoutForms
                userId={options.userId}
                timedOutUntil={options.timeout.timedOutUntil}
                state={state}
                pending={pending}
                action={action}
              />
            )}
          </Sanction>
          <Sanction headingId="sanctions-kick" heading="Expulsion">
            <KickForm
              userId={options.userId}
              state={state}
              pending={pending}
              action={action}
            />
          </Sanction>
        </>
      )}
      <p role="status" className="text-sm">
        {pending
          ? "Envoi en cours…"
          : state?.ok === true && <WriteResultMessage result={state} />}
      </p>
      <p role="alert" id={SANCTION_ALERT_ID} className="text-sm">
        {state?.ok === false && <WriteResultMessage result={state} />}
      </p>
    </section>
  )
}

function Sanction({
  headingId,
  heading,
  children,
}: {
  headingId: string
  heading: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h3 id={headingId} className="font-medium">
        {heading}
      </h3>
      {children}
    </section>
  )
}
