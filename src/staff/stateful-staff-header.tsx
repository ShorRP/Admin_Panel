"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { StaffHeader } from "./staff-header"

export function StatefulStaffHeader({ memberName }: { memberName: ReactNode }) {
  return <StaffHeader currentPath={usePathname()} memberName={memberName} />
}
