import { cn } from "cn"

import { Button } from "@/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/ui/dialog"
import { DIALOG_ONLY_FADES_WHEN_REDUCED } from "@/ui/dialog-motion"
import {
  SanctionConfirmation,
  type Confirmation,
} from "./sanction-confirmation"
import { CARD_BUTTON_CLASS, RED_BUTTON_CLASS } from "./sanction-form"

export function SanctionConfirmationDialog({
  confirmation,
  pending,
}: {
  confirmation: Confirmation
  pending: boolean
}) {
  const { label, icon: Icon } = confirmation
  return (
    <Dialog>
      <DialogTrigger
        disabled={pending}
        render={<Button className={cn(CARD_BUTTON_CLASS, RED_BUTTON_CLASS)} />}
      >
        <Icon aria-hidden data-icon="inline-start" />
        {label}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn("gap-5 p-6 sm:max-w-110", DIALOG_ONLY_FADES_WHEN_REDUCED)}
      >
        <SanctionConfirmation {...confirmation} />
      </DialogContent>
    </Dialog>
  )
}
