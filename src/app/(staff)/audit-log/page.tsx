import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { AuditLog } from "@/audit-log/audit-log"
import { AuditLogSkeleton } from "@/audit-log/audit-log-skeleton"
import { readAuditLog } from "@/audit-log/read-audit-log"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
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
      <main className="mx-auto flex max-w-270 flex-col gap-7">
        <PageHeader
          overline="45 derniers jours · Heures de Paris"
          title="Journal d’audit"
          className="max-w-160"
        >
          Qui a changé quoi, et quand : les mots interdits, les sanctions et
          leurs levées, depuis le panel comme depuis Discord.
        </PageHeader>
        <OrnamentRule leadingLine />
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
  const { before, type } = await searchParams
  return (
    <AuditLog
      page={await readAuditLog(discord, { before, type })}
      opensModeration={staffMember.opensModeration}
    />
  )
}
