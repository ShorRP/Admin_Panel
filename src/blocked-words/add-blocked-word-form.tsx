import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
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
    <form action={action} className="flex flex-col gap-2">
      <Label htmlFor={FIELD_ID}>Mot ou expression</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={FIELD_ID}
          name="word"
          defaultValue={state?.ok === false ? state.word : ""}
          aria-describedby={ALERT_ID}
          autoComplete="off"
          className="max-w-xs flex-1"
        />
        <Button type="submit" disabled={pending}>
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
      <p role="status" className="text-sm">
        {state?.ok === true ? state.message : ""}
      </p>
      <p role="alert" id={ALERT_ID} className="text-sm">
        {state?.ok === false ? state.message : ""}
      </p>
    </form>
  )
}
