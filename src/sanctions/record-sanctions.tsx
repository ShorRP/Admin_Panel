import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { BanForm } from "./ban-form"
import { BanLiftForm } from "./ban-lift-form"
import { KickForm } from "./kick-form"
import { SANCTION_ALERT_ID, SENTENCE_CLASS } from "./sanction-form"
import { SanctionNotice } from "./sanction-notice"
import type { SanctionOptions } from "./sanction-options"
import type { SanctionFields, SanctionResult } from "./sanction-result"
import { TimeoutForms } from "./timeout-forms"

const HEADING_ID = "sanctions"

type TabValue = Extract<SanctionFields["change"], "time-out" | "kick" | "ban">

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
      hidden={options.kind === "none"}
      className="rounded-xl border bg-card"
    >
      <div className="border-b px-5 py-3.5">
        <h2
          id={HEADING_ID}
          className="font-heading text-xl leading-[1.2] font-medium"
        >
          Sanctions
        </h2>
      </div>
      <div className="flex flex-col p-5">
        {options.kind === "refused" && (
          <p className={SENTENCE_CLASS}>{options.reason}</p>
        )}
        {options.kind === "member" && (
          <Tabs defaultValue="time-out">
            <TabsList className="w-full group-data-horizontal/tabs:h-auto">
              <SanctionTab value="time-out">Exclusion temporaire</SanctionTab>
              <SanctionTab value="kick">Expulsion</SanctionTab>
              {options.ban && (
                <SanctionTab value="ban">Bannissement</SanctionTab>
              )}
            </TabsList>
            <SanctionPanel value="time-out">
              {options.timeout.kind === "refused" ? (
                <p className={SENTENCE_CLASS}>{options.timeout.reason}</p>
              ) : (
                <TimeoutForms
                  userId={options.userId}
                  timedOutUntil={options.timeout.timedOutUntil}
                  state={state}
                  pending={pending}
                  action={action}
                />
              )}
            </SanctionPanel>
            <SanctionPanel value="kick">
              <KickForm
                userId={options.userId}
                name={options.name}
                state={state}
                pending={pending}
                action={action}
              />
            </SanctionPanel>
            {options.ban && (
              <SanctionPanel value="ban">
                <BanForm
                  userId={options.userId}
                  name={options.name}
                  standing="member"
                  state={state}
                  pending={pending}
                  action={action}
                />
              </SanctionPanel>
            )}
          </Tabs>
        )}
        {options.kind === "absent" && (
          <BanForm
            userId={options.userId}
            name={options.name}
            standing="absent"
            state={state}
            pending={pending}
            action={action}
          />
        )}
        {options.kind === "banned" && (
          <div className="flex flex-col gap-4.5">
            <SanctionNotice
              kind="ban"
              title="Compte banni"
              detail="Un bannissement n’a pas de fin : seul le staff peut le lever."
            />
            <BanLiftForm
              userId={options.userId}
              state={state}
              pending={pending}
              action={action}
            />
          </div>
        )}
        <p role="status" className="text-sm not-empty:mt-4">
          {pending && "Envoi en cours…"}
        </p>
        <p
          role="alert"
          id={SANCTION_ALERT_ID}
          className="text-sm not-empty:mt-4"
        >
          {state?.ok === false && (
            <WriteFailureMessage message={state.message} />
          )}
        </p>
      </div>
    </section>
  )
}

function SanctionTab({
  value,
  children,
}: {
  value: TabValue
  children: ReactNode
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-auto min-h-7.5 flex-auto self-stretch text-[0.78125rem] leading-4 whitespace-normal"
    >
      {children}
    </TabsTrigger>
  )
}

function SanctionPanel({
  value,
  children,
}: {
  value: TabValue
  children: ReactNode
}) {
  return (
    <TabsContent value={value} keepMounted className="pt-3">
      {children}
    </TabsContent>
  )
}
