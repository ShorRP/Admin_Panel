"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { removeExemptChannelAction } from "./actions"
import { ExemptChannelList } from "./exempt-channel-list"
import type { ExemptChannel } from "./read-link-rule"
import type { ChannelFields, WriteResult } from "./write-result"

export function StatefulExemptChannelList({
  channels,
}: {
  channels: ExemptChannel[]
}) {
  const [state, action, pending] = useActionState<
    WriteResult<ChannelFields> | null,
    FormData
  >(removeExemptChannelAction, null)
  useSuccessToast(state)
  return (
    <ExemptChannelList
      channels={channels}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
