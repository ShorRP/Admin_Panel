"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { addBlockedWordAction } from "./actions"
import { AddBlockedWordForm } from "./add-blocked-word-form"
import type { BlockedWordActionId } from "./blocked-word-action"
import type { WriteResult } from "./write-result"

export function StatefulAddBlockedWordForm({
  actions,
}: {
  actions: BlockedWordActionId[]
}) {
  const [state, action, pending] = useActionState<WriteResult | null, FormData>(
    addBlockedWordAction,
    null
  )
  useSuccessToast(state)
  return (
    <AddBlockedWordForm
      state={state}
      pending={pending}
      actions={actions}
      action={action}
    />
  )
}
