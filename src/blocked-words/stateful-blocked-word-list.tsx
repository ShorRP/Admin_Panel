"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { removeBlockedWordAction } from "./actions"
import { BlockedWordList } from "./blocked-word-list"
import type { FilteredBlockedWords } from "./filter-blocked-words"
import type { WriteResult } from "./write-result"

export function StatefulBlockedWordList(listing: FilteredBlockedWords) {
  const [state, action, pending] = useActionState<WriteResult | null, FormData>(
    removeBlockedWordAction,
    null
  )
  useSuccessToast(state)
  return (
    <BlockedWordList
      {...listing}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
