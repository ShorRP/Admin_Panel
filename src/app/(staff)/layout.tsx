import { Suspense, type ReactNode } from "react"
import { connection } from "next/server"

import { BlockedWordCountBadge } from "@/blocked-words/blocked-word-count-badge"
import { readBlockedWordCount } from "@/blocked-words/read-blocked-word-count"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { opensModerationOnceRead, type StaffMember } from "@/staff/staff-member"
import { StaffMemberIdentity } from "@/staff/staff-member-identity"
import { StaffMemberIdentitySkeleton } from "@/staff/staff-member-identity-skeleton"
import { StatefulStaffHeader } from "@/staff/stateful-staff-header"
import { Toaster } from "@/ui/toast"

export default function StaffLayout({ children }: { children: ReactNode }) {
  const staffMember = currentStaffMember()
  return (
    <>
      <div className="flex min-h-svh flex-col md:flex-row">
        <StatefulStaffHeader
          member={
            <Suspense fallback={<StaffMemberIdentitySkeleton />}>
              <CurrentStaffMemberIdentity staffMember={staffMember} />
            </Suspense>
          }
          opensModeration={opensModerationOnceRead(staffMember)}
          blockedWordCount={
            <Suspense fallback={null}>
              <CurrentBlockedWordCount staffMember={staffMember} />
            </Suspense>
          }
        />
        <div className="min-w-0 flex-1 px-[clamp(1.25rem,4vw,3.5rem)] pt-11 pb-24">
          {children}
        </div>
      </div>
      <Toaster />
    </>
  )
}

async function currentStaffMember() {
  await connection()
  return await requireStaffMember(createDiscordApi())
}

async function CurrentBlockedWordCount({
  staffMember,
}: {
  staffMember: Promise<StaffMember>
}) {
  await connection()
  return (
    <BlockedWordCountBadge
      count={await readBlockedWordCount(createDiscordApi(), staffMember)}
    />
  )
}

async function CurrentStaffMemberIdentity({
  staffMember,
}: {
  staffMember: Promise<StaffMember>
}) {
  const { name, avatarUrl, opensModeration } = await staffMember
  return (
    <StaffMemberIdentity
      name={name}
      avatarUrl={avatarUrl}
      opensModeration={opensModeration}
    />
  )
}
