"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { addAllowedDomainAction } from "./actions"
import { AddAllowedDomainForm } from "./add-allowed-domain-form"
import type { DomainFields, WriteResult } from "./write-result"

export function StatefulAddAllowedDomainForm() {
  const [state, action, pending] = useActionState<
    WriteResult<DomainFields> | null,
    FormData
  >(addAllowedDomainAction, null)
  useSuccessToast(state)
  return (
    <AddAllowedDomainForm state={state} pending={pending} action={action} />
  )
}
