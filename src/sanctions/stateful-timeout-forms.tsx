"use client"

import { useActionState } from "react"
import type { Snowflake } from "discord-api-types/v10"

import { changeTimeoutAction } from "./actions"
import { TimeoutForms } from "./timeout-forms"
import type { TimeoutResult } from "./timeout-result"

export function StatefulTimeoutForms({
  userId,
  timedOutUntil,
}: {
  userId: Snowflake
  timedOutUntil: Date | null
}) {
  const [state, action, pending] = useActionState<
    TimeoutResult | null,
    FormData
  >(changeTimeoutAction, null)
  return (
    <TimeoutForms
      userId={userId}
      timedOutUntil={timedOutUntil}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
