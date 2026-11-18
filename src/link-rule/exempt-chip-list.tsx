import { cn } from "cn"
import { X } from "lucide-react"

import { Button } from "@/ui/button"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { CHIP_CLASSES, CHIPS_CLASSES } from "./link-rule-layout"

export type ExemptChip = {
  id: string
  label: string
  crossName: string
  removable: boolean
}

export function ExemptChipList({
  chips,
  field,
  message,
  pending,
  action,
}: {
  chips: ExemptChip[]
  field: string
  message: string | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <div className="flex flex-col">
      {chips.length > 0 && (
        <ul className={CHIPS_CLASSES}>
          {chips.map(({ id, label, crossName, removable }) => (
            <li
              key={id}
              className={cn(
                CHIP_CLASSES,
                removable && "flex items-center gap-0.5 py-0 pr-0.5"
              )}
            >
              <span className="min-w-0 py-1">{label}</span>
              {removable && (
                <form action={action} className="flex shrink-0">
                  <input type="hidden" name={field} value={id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    className="text-muted-foreground"
                  >
                    <X aria-hidden className="size-3.75" />
                    <span className="sr-only">{crossName}</span>
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="text-sm not-empty:mt-2">
        {pending && "Envoi en cours…"}
      </p>
      <p role="alert" className="text-sm not-empty:mt-2">
        {message !== null && <WriteFailureMessage message={message} />}
      </p>
    </div>
  )
}
