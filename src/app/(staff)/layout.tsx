import { Suspense, type ReactNode } from "react"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { StatefulStaffHeader } from "@/staff/stateful-staff-header"

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StatefulStaffHeader
        memberName={
          <Suspense
            fallback={<span role="status">Chargement de ton nom…</span>}
          >
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
