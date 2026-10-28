"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { StaffHeader } from "./staff-header"

export function StatefulStaffHeader({ member }: { member: ReactNode }) {
  return <StaffHeader currentPath={usePathname()} member={member} />
}
