import { cn } from "cn"
import { Check, LoaderCircle } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { linkRuleActionLabel, type LinkRuleActionId } from "./link-rule-action"
import { CHOICE_FIELD_ROW_CLASSES, CONTROL_CLASSES } from "./link-rule-layout"
import type { ActionFields, WriteResult } from "./write-result"

const FIELD_ID = "link-rule-action-choice"

const ALERT_ID = `${FIELD_ID}-error`

export function ChangeLinkRuleActionForm({
  choices,
  current,
  state,
  pending,
  action,
}: {
  choices: LinkRuleActionId[]
  current: LinkRuleActionId
  state: WriteResult<ActionFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const typed = choices.find(
    (choice) => state?.ok === false && choice === state.action
  )
  const chosen = typed ?? current
  return (
    <form action={action} className="@container flex flex-col">
      <Label htmlFor={FIELD_ID} className="text-[0.8125rem] leading-4.5">
        Changer l’action
      </Label>
      <div className={CHOICE_FIELD_ROW_CLASSES}>
        <NativeSelect
          key={chosen}
          id={FIELD_ID}
          name="action"
          defaultValue={chosen}
          aria-describedby={ALERT_ID}
          className="w-full @md:min-w-0 @md:flex-1 [&>select]:h-9.5 [&>select]:touch:h-11"
        >
          {choices.map((choice) => (
            <NativeSelectOption key={choice} value={choice}>
              {linkRuleActionLabel(choice)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          type="submit"
          disabled={pending}
          className={cn(
            "w-full px-3.5 has-data-[icon=inline-start]:pl-3 @md:w-auto",
            CONTROL_CLASSES
          )}
        >
          {pending ? (
            <>
              <LoaderCircle
                aria-hidden
                data-icon="inline-start"
                className="motion-safe:animate-spin"
              />
              Changement…
            </>
          ) : (
            <>
              <Check aria-hidden data-icon="inline-start" />
              Changer
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
