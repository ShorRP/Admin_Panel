"use client"

import { useActionState } from "react"

import { changeSanctionAction } from "./actions"
import { RecordSanctions } from "./record-sanctions"
import type { SanctionOptions } from "./sanction-options"
import type { SanctionResult } from "./sanction-result"

export function StatefulRecordSanctions({
  options,
}: {
  options: SanctionOptions
}) {
  const [state, action, pending] = useActionState<
    SanctionResult | null,
    FormData
  >(changeSanctionAction, null)
  return (
    <RecordSanctions
      options={options}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
