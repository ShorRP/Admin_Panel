import { Check } from "lucide-react"

import { Button } from "@/ui/button"
import { DialogClose, DialogHeader, DialogTitle } from "@/ui/dialog"
import { Label } from "@/ui/label"
import type { BlockedWordActionId } from "./blocked-word-action"
import { BlockedWordActionSelect } from "./blocked-word-action-select"
import { quoted } from "./french-text"

export type ActionChangeFields = {
  formId: string
  selectId: string
  word: string
  actions: BlockedWordActionId[]
  current: BlockedWordActionId
}

export function actionChangeTitle(word: string) {
  return `Changer l’action de ${quoted(word)}`
}

export function BlockedWordActionChange({
  formId,
  selectId,
  word,
  actions,
  current,
}: ActionChangeFields) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[1.4375rem] leading-[1.15] wrap-break-word">
          {actionChangeTitle(word)}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId} className="text-[0.8125rem] leading-4.5">
          Action
        </Label>
        <BlockedWordActionSelect
          id={selectId}
          form={formId}
          actions={actions}
          selected={current}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <DialogClose render={<Button variant="outline" size="lg" />}>
          Annuler
        </DialogClose>
        <DialogClose type="submit" form={formId} render={<Button size="lg" />}>
          <Check aria-hidden data-icon="inline-start" />
          Changer
        </DialogClose>
      </div>
    </>
  )
}
