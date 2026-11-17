"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { removeAllowedDomainAction } from "./actions"
import { AllowedDomainList } from "./allowed-domain-list"
import type { DomainFields, WriteResult } from "./write-result"

export function StatefulAllowedDomainList({
  domains,
  removable,
}: {
  domains: string[]
  removable: boolean
}) {
  const [state, action, pending] = useActionState<
    WriteResult<DomainFields> | null,
    FormData
  >(removeAllowedDomainAction, null)
  useSuccessToast(state)
  return (
    <AllowedDomainList
      domains={domains}
      removable={removable}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
