import { cn } from "cn"
import { Pencil } from "lucide-react"

import { Button } from "@/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/ui/dialog"
import { DIALOG_ONLY_FADES_WHEN_REDUCED } from "@/ui/dialog-motion"
import type { BlockedWordActionId } from "./blocked-word-action"
import {
  actionChangeTitle,
  BlockedWordActionChange,
} from "./blocked-word-action-change"

export function BlockedWordActionDialog({
  index,
  word,
  current,
  actions,
  pending,
  action,
}: {
  index: number
  word: string
  current: BlockedWordActionId
  actions: BlockedWordActionId[]
  pending: boolean
  action: (formData: FormData) => void
}) {
  const formId = `change-action-form-${index}`
  return (
    <form id={formId} action={action} className="flex">
      <input type="hidden" name="change" value="action" />
      <input type="hidden" name="word" value={word} />
      <Dialog>
        <DialogTrigger
          disabled={pending}
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
            />
          }
        >
          <Pencil aria-hidden className="size-3.75" />
          <span className="sr-only">{actionChangeTitle(word)}</span>
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "gap-5 p-6 sm:max-w-110",
            DIALOG_ONLY_FADES_WHEN_REDUCED
          )}
        >
          <BlockedWordActionChange
            formId={formId}
            selectId={`change-action-${index}`}
            word={word}
            actions={actions}
            current={current}
          />
        </DialogContent>
      </Dialog>
    </form>
  )
}
