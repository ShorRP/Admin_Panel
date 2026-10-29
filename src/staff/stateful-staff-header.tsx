"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { StaffHeader } from "./staff-header"

export function StatefulStaffHeader({
  member,
  opensModeration,
  blockedWordCount,
}: {
  member: ReactNode
  opensModeration: Promise<boolean>
  blockedWordCount: Promise<number | null>
}) {
  return (
    <StaffHeader
      currentPath={usePathname()}
      member={member}
      opensModeration={opensModeration}
      blockedWordCount={blockedWordCount}
    />
  )
}
