import { Suspense, type ReactNode } from "react"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { StaffMemberIdentity } from "@/staff/staff-member-identity"
import { StaffMemberIdentitySkeleton } from "@/staff/staff-member-identity-skeleton"
import { StatefulStaffHeader } from "@/staff/stateful-staff-header"

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StatefulStaffHeader
        member={
          <Suspense fallback={<StaffMemberIdentitySkeleton />}>
            <CurrentStaffMemberIdentity />
          </Suspense>
        }
      />
      {children}
    </>
  )
}

async function CurrentStaffMemberIdentity() {
  await connection()
  const { name, avatarUrl } = await requireStaffMember(createDiscordApi())
  return <StaffMemberIdentity name={name} avatarUrl={avatarUrl} />
}
