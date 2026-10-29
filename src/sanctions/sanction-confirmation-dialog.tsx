import { cn } from "cn"

import { Button } from "@/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/ui/dialog"
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
        className="gap-5 p-6 sm:max-w-110 motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
      >
        <SanctionConfirmation {...confirmation} />
      </DialogContent>
    </Dialog>
  )
}
