"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { addExemptRoleAction } from "./actions"
import { AddExemptRoleForm } from "./add-exempt-role-form"
import type { RoleChoice } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

export function StatefulAddExemptRoleForm({ roles }: { roles: RoleChoice[] }) {
  const [state, action, pending] = useActionState<
    WriteResult<RoleFields> | null,
    FormData
  >(addExemptRoleAction, null)
  useSuccessToast(state)
  return (
    <AddExemptRoleForm
      roles={roles}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
