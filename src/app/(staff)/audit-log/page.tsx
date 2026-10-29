import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { AuditLog } from "@/audit-log/audit-log"
import { AuditLogSkeleton } from "@/audit-log/audit-log-skeleton"
import { readAuditLog } from "@/audit-log/read-audit-log"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Journal d’audit" }

export default function AuditLogPage({
  searchParams,
}: PageProps<"/audit-log">) {
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <h1 className="font-heading text-xl font-medium">Journal d’audit</h1>
        <p>L’historique couvre 45 jours. Heures de Paris.</p>
        <SuspenseWithSkeleton skeleton={<AuditLogSkeleton />}>
          <AuditLogFromDiscord searchParams={searchParams} />
        </SuspenseWithSkeleton>
      </main>
    </ViewTransition>
  )
}

async function AuditLogFromDiscord({
  searchParams,
}: Pick<PageProps<"/audit-log">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const { before } = await searchParams
  return (
    <AuditLog
      page={await readAuditLog(discord, before)}
      opensModeration={staffMember.opensModeration}
    />
  )
}
