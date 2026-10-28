"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { StaffHeader } from "./staff-header"

export function StatefulStaffHeader({
  member,
  opensModeration,
}: {
  member: ReactNode
  opensModeration: Promise<boolean>
}) {
  return (
    <StaffHeader
      currentPath={usePathname()}
      member={member}
      opensModeration={opensModeration}
    />
  )
}
