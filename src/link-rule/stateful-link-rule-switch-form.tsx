"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { switchLinkRuleAction } from "./actions"
import { LinkRuleSwitchForm } from "./link-rule-switch-form"
import type { LinkRuleStatus } from "./read-link-rule"
import type { WriteResult } from "./write-result"

export function StatefulLinkRuleSwitchForm({
  status,
}: {
  status: LinkRuleStatus
}) {
  const [state, action, pending] = useActionState<WriteResult | null, FormData>(
    switchLinkRuleAction,
    null
  )
  useSuccessToast(state)
  return (
    <LinkRuleSwitchForm
      status={status}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
