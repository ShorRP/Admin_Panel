import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import type { WriteResult } from "./write-result"

const FIELD_ID = "blocked-word"

const ALERT_ID = "blocked-word-error"

export function AddBlockedWordForm({
  state,
  pending,
  action,
}: {
  state: WriteResult | null
  pending: boolean
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
      <div className="mt-2.5 flex gap-2">
        <Input
          id={FIELD_ID}
          name="word"
          defaultValue={state?.ok === false ? state.word : ""}
          aria-describedby={ALERT_ID}
          autoComplete="off"
          placeholder="Ex. : free nitro"
          className="h-9.5 flex-1 px-3"
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-9.5 px-3.5 has-data-[icon=inline-start]:pl-3"
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
