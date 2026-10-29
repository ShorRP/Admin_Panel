"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { removeBlockedWordAction } from "./actions"
import { BlockedWordList } from "./blocked-word-list"
import type { WriteResult } from "./write-result"

export function StatefulBlockedWordList({ words }: { words: string[] }) {
  const [state, action, pending] = useActionState<WriteResult | null, FormData>(
    removeBlockedWordAction,
    null
  )
  useSuccessToast(state)
  return (
    <BlockedWordList
      words={words}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
