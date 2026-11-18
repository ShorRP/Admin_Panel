"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { addExemptChannelAction } from "./actions"
import { AddExemptChannelForm } from "./add-exempt-channel-form"
import type { ChannelChoiceGroup } from "./exemptable-channel"
import type { ChannelFields, WriteResult } from "./write-result"

export function StatefulAddExemptChannelForm({
  groups,
}: {
  groups: ChannelChoiceGroup[]
}) {
  const [state, action, pending] = useActionState<
    WriteResult<ChannelFields> | null,
    FormData
  >(addExemptChannelAction, null)
  useSuccessToast(state)
  return (
    <AddExemptChannelForm
      groups={groups}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
