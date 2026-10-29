import { cn } from "cn"

import { Label } from "@/ui/label"
import { Textarea } from "@/ui/textarea"
import { SANCTION_ALERT_ID } from "./sanction-form"

const READ_BY_MEMBER_PLACEHOLDER = "Écris le motif tel que le membre le lira."

export function ReasonField({
  id,
  label,
  defaultValue,
  readByMember = false,
  className,
}: {
  id: string
  label: string
  defaultValue: string
  readByMember?: boolean
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
        placeholder={readByMember ? READ_BY_MEMBER_PLACEHOLDER : undefined}
        aria-describedby={SANCTION_ALERT_ID}
        className={cn("min-h-19", className)}
      />
    </div>
  )
}
