import { Suspense, type ReactNode } from "react"
import { connection } from "next/server"

import { BlockedWordCountBadge } from "@/blocked-words/blocked-word-count-badge"
import { readBlockedWordCount } from "@/blocked-words/read-blocked-word-count"
import { createDiscordApi } from "@/discord/discord-api"
import { configuredGameLog } from "@/game-log/configured-game-log"
import { viewsGameLogOnceRead } from "@/game-log/views-game-log-once-read"
import { ownRecordOnceRead } from "@/records/own-record"
import { requireStaffMember } from "@/staff/require-staff-member"
import { opensModerationOnceRead, type StaffMember } from "@/staff/staff-member"
import { StaffMemberIdentity } from "@/staff/staff-member-identity"
import { StaffMemberIdentitySkeleton } from "@/staff/staff-member-identity-skeleton"
import { staffRoleLabel } from "@/staff/staff-role-label"
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
          viewsGameLog={currentViewsGameLog(staffMember)}
          ownRecord={ownRecordOnceRead(staffMember)}
          blockedWordCount={
            <Suspense fallback={null}>
              <CurrentBlockedWordCount staffMember={staffMember} />
            </Suspense>
          }
        />
        <div className="min-w-0 flex-1 pt-6 pr-[max(clamp(1.25rem,4vw,3.5rem),env(safe-area-inset-right))] pb-24 pl-[max(clamp(1.25rem,4vw,3.5rem),env(safe-area-inset-left))] md:pt-11 md:pl-[clamp(1.25rem,4vw,3.5rem)]">
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

async function currentViewsGameLog(staffMember: Promise<StaffMember>) {
  await connection()
  return await viewsGameLogOnceRead(
    createDiscordApi(),
    configuredGameLog(),
    staffMember
  )
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
      staffRole={staffRoleLabel(opensModeration)}
      avatarUrl={avatarUrl}
    />
  )
}
