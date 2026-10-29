import { TriangleAlert, type LucideIcon } from "lucide-react"

import { Button } from "@/ui/button"
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import { RED_BUTTON_CLASS } from "./sanction-form"

export type Confirmation = {
  formId: string
  label: string
  icon: LucideIcon
  title: string
  description: string
}

export function SanctionConfirmation({
  formId,
  label,
  icon: Icon,
  title,
  description,
}: Confirmation) {
  return (
    <>
      <div className="flex gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <TriangleAlert aria-hidden className="size-4.5" />
        </span>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-[1.4375rem] leading-[1.15]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[0.84375rem] text-pretty">
            {description}
          </DialogDescription>
        </DialogHeader>
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose render={<Button variant="outline" size="lg" />}>
          Annuler
        </DialogClose>
        <DialogClose
          type="submit"
          form={formId}
          render={<Button size="lg" className={RED_BUTTON_CLASS} />}
        >
          <Icon aria-hidden data-icon="inline-start" />
          {label}
        </DialogClose>
      </div>
    </>
  )
}
