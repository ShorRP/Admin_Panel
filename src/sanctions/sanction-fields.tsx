import { cn } from "cn"

import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import {
  CHOICE_CLASS,
  NATIVE_CONTROL_CLASS,
  SANCTION_ALERT_ID,
} from "./sanction-form"

export function ReasonField({
  id,
  label,
  defaultValue,
  placeholder,
  className,
}: {
  id: string
  label: string
  defaultValue: string
  placeholder?: string | undefined
  className?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[0.8125rem]">
        {label}
      </Label>
      <Textarea
        id={id}
        name="reason"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-describedby={SANCTION_ALERT_ID}
        className={cn("min-h-19", className)}
      />
    </div>
  )
}

export function NotifyCheckbox({
  defaultChecked,
}: {
  defaultChecked: boolean
}) {
  return (
    <label className={CHOICE_CLASS}>
      <input
        type="checkbox"
        name="notify"
        defaultChecked={defaultChecked}
        aria-describedby={SANCTION_ALERT_ID}
        className={NATIVE_CONTROL_CLASS}
      />
      Prévenir en message privé
    </label>
  )
}
