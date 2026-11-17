"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { removeAllowedDomainAction } from "./actions"
import { AllowedDomainList } from "./allowed-domain-list"
import type { DomainFields, WriteResult } from "./write-result"

export function StatefulAllowedDomainList({ domains }: { domains: string[] }) {
  const [state, action, pending] = useActionState<
    WriteResult<DomainFields> | null,
    FormData
  >(removeAllowedDomainAction, null)
  useSuccessToast(state)
  return (
    <AllowedDomainList
      domains={domains}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
