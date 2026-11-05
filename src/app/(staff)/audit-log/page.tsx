import type { Metadata } from "next"
import { connection } from "next/server"

import { AuditLog } from "@/audit-log/audit-log"
import { AuditLogSkeleton } from "@/audit-log/audit-log-skeleton"
import { readAuditLog } from "@/audit-log/read-audit-log"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { LogPage } from "@/ui/log-page"

export const metadata: Metadata = { title: "Journal d’audit" }

export default function AuditLogPage({
  searchParams,
}: PageProps<"/audit-log">) {
  return (
    <LogPage
      overline="45 derniers jours · Heures de Paris"
      title="Journal d’audit"
      description="Qui a changé quoi, et quand : les mots interdits, les sanctions et leurs levées, depuis le panel comme depuis Discord."
      skeleton={<AuditLogSkeleton />}
    >
      <AuditLogFromDiscord searchParams={searchParams} />
    </LogPage>
  )
}

async function AuditLogFromDiscord({
  searchParams,
}: Pick<PageProps<"/audit-log">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const { before, type, author, account, from, to, text } = await searchParams
  return (
    <AuditLog
      page={await readAuditLog(discord, {
        before,
        type,
        author,
        account,
        from,
        to,
        text,
      })}
      opensModeration={staffMember.opensModeration}
    />
  )
}
