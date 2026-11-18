"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { changeLinkRuleActionAction } from "./actions"
import { ChangeLinkRuleActionForm } from "./change-link-rule-action-form"
import type { LinkRuleActionId } from "./link-rule-action"
import type { ActionFields, WriteResult } from "./write-result"

export function StatefulChangeLinkRuleActionForm({
  choices,
  current,
}: {
  choices: LinkRuleActionId[]
  current: LinkRuleActionId
}) {
  const [state, action, pending] = useActionState<
    WriteResult<ActionFields> | null,
    FormData
  >(changeLinkRuleActionAction, null)
  useSuccessToast(state)
  return (
    <ChangeLinkRuleActionForm
      choices={choices}
      current={current}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
