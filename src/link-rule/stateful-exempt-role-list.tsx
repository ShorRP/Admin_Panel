"use client"

import { useActionState } from "react"

import { useSuccessToast } from "@/ui/use-success-toast"
import { removeExemptRoleAction } from "./actions"
import { ExemptRoleList } from "./exempt-role-list"
import type { NamedItem } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

export function StatefulExemptRoleList({
  roles,
  staffRoleId,
}: {
  roles: NamedItem[]
  staffRoleId: string
}) {
  const [state, action, pending] = useActionState<
    WriteResult<RoleFields> | null,
    FormData
  >(removeExemptRoleAction, null)
  useSuccessToast(state)
  return (
    <ExemptRoleList
      roles={roles}
      staffRoleId={staffRoleId}
      state={state}
      pending={pending}
      action={action}
    />
  )
}
