import type { ReactNode } from "react"
import { cn } from "cn"
import { TriangleAlert, type LucideIcon } from "lucide-react"

import { Button } from "@/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"
import { RED_BUTTON_CLASS, SUBMIT_CLASS } from "./sanction-form"

export function ConfirmedSanction({
  label,
  icon: Icon,
  pending,
  children,
}: {
  label: string
  icon: LucideIcon
  pending: boolean
  children: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger
        disabled={pending}
        render={<Button className={cn(SUBMIT_CLASS, RED_BUTTON_CLASS)} />}
      >
        <Icon aria-hidden data-icon="inline-start" />
        {label}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="gap-5 p-6 sm:max-w-110 motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function SanctionConfirmation({
  formId,
  title,
  description,
  label,
  icon: Icon,
}: {
  formId: string
  title: string
  description: string
  label: string
  icon: LucideIcon
}) {
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
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
