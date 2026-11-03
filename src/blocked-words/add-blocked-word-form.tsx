import { cn } from "cn"
import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import {
  ACTION_COLUMN_CLASSES,
  ACTION_ROW_CLASSES,
  FORM_CARD_CLASSES,
  FORM_CONTROL_CLASSES,
} from "./add-blocked-word-form-layout"
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
    <form action={action} className={FORM_CARD_CLASSES}>
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
        className={cn("mt-2.5 px-3", FORM_CONTROL_CLASSES)}
      />
      <div className={ACTION_ROW_CLASSES}>
        <div className={ACTION_COLUMN_CLASSES}>
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
          className={cn(
            "w-full px-3.5 has-data-[icon=inline-start]:pl-3 sm:w-auto",
            FORM_CONTROL_CLASSES
          )}
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
