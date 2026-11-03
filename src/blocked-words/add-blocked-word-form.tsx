import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import type { BlockedWordActionId } from "./blocked-word-action"
import { BlockedWordActionSelect } from "./blocked-word-action-select"
import type { WriteResult } from "./write-result"

const FIELD_ID = "blocked-word"

const ACTION_ID = "blocked-word-action"

const ALERT_ID = "blocked-word-error"

const DEFAULT_ACTION: BlockedWordActionId = "block"

export function AddBlockedWordForm({
  state,
  pending,
  actions,
  action,
}: {
  state: WriteResult | null
  pending: boolean
  actions: BlockedWordActionId[]
  action: (formData: FormData) => void
}) {
  return (
    <form
      action={action}
      className="flex flex-col rounded-xl border bg-card px-5 py-4.5"
    >
      <Label htmlFor={FIELD_ID} className="text-[0.8125rem] leading-4.5">
        Ajouter un mot ou une expression
      </Label>
      <Input
        id={FIELD_ID}
        name="word"
        defaultValue={state?.ok === false ? state.word : ""}
        aria-describedby={ALERT_ID}
        autoComplete="off"
        placeholder="Ex. : free nitro"
        className="mt-2.5 h-9.5 px-3"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-3 sm:gap-y-2.5">
        <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-64 sm:flex-1">
          <Label htmlFor={ACTION_ID} className="text-[0.8125rem] leading-4.5">
            Action
          </Label>
          <BlockedWordActionSelect
            id={ACTION_ID}
            actions={actions}
            selected={state?.ok === false ? state.action : DEFAULT_ACTION}
            describedBy={ALERT_ID}
            className="w-full sm:w-fit"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-9.5 w-full px-3.5 has-data-[icon=inline-start]:pl-3 sm:w-auto"
        >
          {pending ? (
            <>
              <LoaderCircle
                aria-hidden
                data-icon="inline-start"
                className="motion-safe:animate-spin"
              />
              Ajout…
            </>
          ) : (
            <>
              <Plus aria-hidden data-icon="inline-start" />
              Ajouter
            </>
          )}
        </Button>
      </div>
      <p role="alert" id={ALERT_ID} className="text-sm not-empty:mt-2.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </form>
  )
}
