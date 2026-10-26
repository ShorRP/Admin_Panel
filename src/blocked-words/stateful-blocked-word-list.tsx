"use client"

import { useActionState } from "react"

import { removeBlockedWordAction } from "./actions"
import { BlockedWordList } from "./blocked-word-list"
import type { WriteResult } from "./write-result"

export function StatefulBlockedWordList({ words }: { words: string[] }) {
  const [state, action, pending] = useActionState<WriteResult | null, FormData>(
    removeBlockedWordAction,
    null
  )
  return (
    <BlockedWordList
      words={words}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
