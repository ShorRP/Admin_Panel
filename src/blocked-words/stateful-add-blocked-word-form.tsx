"use client"

import { useActionState } from "react"

import { addBlockedWordAction } from "./actions"
import { AddBlockedWordForm } from "./add-blocked-word-form"
import type { WriteResult } from "./write-result"

export function StatefulAddBlockedWordForm() {
  const [state, action, pending] = useActionState<WriteResult | null, FormData>(
    addBlockedWordAction,
    null
  )
  return <AddBlockedWordForm state={state} pending={pending} action={action} />
}
