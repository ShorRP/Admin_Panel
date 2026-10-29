"use client"

import type { ComponentProps } from "react"
import { usePathname } from "next/navigation"

import { StaffHeader } from "./staff-header"

export function StatefulStaffHeader(
  props: Omit<ComponentProps<typeof StaffHeader>, "currentPath">
) {
  return <StaffHeader currentPath={usePathname()} {...props} />
}
