"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { changeAlertChannelAction } from "./actions"
import { ChangeAlertChannelForm } from "./change-alert-channel-form"
import type { ChannelChoiceGroup } from "./exemptable-channel"
import type { LinkRuleAlert } from "./read-link-rule"
import type { ChannelFields, WriteResult } from "./write-result"

export function StatefulChangeAlertChannelForm({
  groups,
  alert,
}: {
  groups: ChannelChoiceGroup[]
  alert: LinkRuleAlert
}) {
  const [state, action, pending] = useActionState<
    WriteResult<ChannelFields> | null,
    FormData
  >(changeAlertChannelAction, null)
  useSuccessToast(state)
  return (
    <ChangeAlertChannelForm
      groups={groups}
      alert={alert}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
