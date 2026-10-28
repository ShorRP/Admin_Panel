import { Suspense, type ReactNode } from "react"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { opensModerationOnceRead, type StaffMember } from "@/staff/staff-member"
import { StaffMemberIdentity } from "@/staff/staff-member-identity"
import { StaffMemberIdentitySkeleton } from "@/staff/staff-member-identity-skeleton"
import { StatefulStaffHeader } from "@/staff/stateful-staff-header"

export default function StaffLayout({ children }: { children: ReactNode }) {
  const staffMember = currentStaffMember()
  return (
    <>
      <StatefulStaffHeader
        member={
          <Suspense fallback={<StaffMemberIdentitySkeleton />}>
            <CurrentStaffMemberIdentity staffMember={staffMember} />
          </Suspense>
        }
        opensModeration={opensModerationOnceRead(staffMember)}
      />
      {children}
    </>
  )
}

async function currentStaffMember() {
  await connection()
  return await requireStaffMember(createDiscordApi())
}

async function CurrentStaffMemberIdentity({
  staffMember,
}: {
  staffMember: Promise<StaffMember>
}) {
  const { name, avatarUrl } = await staffMember
  return <StaffMemberIdentity name={name} avatarUrl={avatarUrl} />
}
