import type { ReactNode } from "react"
import { cn } from "cn"
import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { CHOICE_FIELD_ROW_CLASSES, CONTROL_CLASSES } from "./link-rule-layout"

export function ExemptChoiceForm({
  label,
  fieldId,
  name,
  prompt,
  nothingLeft,
  chosen,
  empty,
  message,
  pending,
  action,
  children,
}: {
  label: string
  fieldId: string
  name: string
  prompt: string
  nothingLeft: string
  chosen: string
  empty: boolean
  message: string | null
  pending: boolean
  action: (formData: FormData) => void
  children: ReactNode
}) {
  const alertId = `${fieldId}-error`
  return (
    <form action={action} className="@container flex flex-col">
      <Label htmlFor={fieldId} className="text-[0.8125rem] leading-4.5">
        {label}
      </Label>
      <div className={CHOICE_FIELD_ROW_CLASSES}>
        <NativeSelect
          key={chosen}
          id={fieldId}
          name={name}
          defaultValue={chosen}
          disabled={empty}
          aria-describedby={alertId}
          className="w-full @md:min-w-0 @md:flex-1 [&>select]:h-9.5 [&>select]:touch:h-11"
        >
          <NativeSelectOption value="">
            {empty ? nothingLeft : prompt}
          </NativeSelectOption>
          {children}
        </NativeSelect>
        <Button
          type="submit"
          disabled={pending || empty}
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
      <p role="alert" id={alertId} className="text-sm not-empty:mt-2.5">
        {message !== null && <WriteFailureMessage message={message} />}
      </p>
    </form>
  )
}
