import { Suspense, type ReactNode } from "react"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { StaffMemberNameSkeleton } from "@/staff/staff-member-name-skeleton"
import { StatefulStaffHeader } from "@/staff/stateful-staff-header"

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StatefulStaffHeader
        memberName={
          <Suspense fallback={<StaffMemberNameSkeleton />}>
            <StaffMemberName />
          </Suspense>
        }
      />
      {children}
    </>
  )
}

async function StaffMemberName() {
  await connection()
  const { name } = await requireStaffMember(createDiscordApi())
  return name
}
