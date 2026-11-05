import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { readRecord } from "@/records/read-record"
import { RecordBreadcrumb } from "@/records/record-breadcrumb"
import { RecordDetailsSkeleton } from "@/records/record-details-skeleton"
import { RecordView } from "@/records/record-view"
import { readSanctionHistory } from "@/sanctions/read-sanction-history"
import { readSanctionOptions } from "@/sanctions/sanction-options"
import { requireModerationAccess } from "@/staff/require-staff-member"
import { configuredArchivesChannelId } from "@/ticket-archives/archives-channel"
import { readTicketArchives } from "@/ticket-archives/read-ticket-archives"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Fiche" }

export const instant = false

export default function RecordPage({ params }: PageProps<"/records/[userId]">) {
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="mx-auto flex max-w-270 flex-col gap-6">
        <RecordBreadcrumb />
        <SuspenseWithSkeleton skeleton={<RecordDetailsSkeleton />}>
          <RecordFromDiscord params={params} />
        </SuspenseWithSkeleton>
      </main>
    </ViewTransition>
  )
}

async function RecordFromDiscord({
  params,
}: Pick<PageProps<"/records/[userId]">, "params">) {
  await connection()
  const discord = createDiscordApi()
  const staffMember = await requireModerationAccess(discord)
  const { userId } = await params
  const archivesChannelId = configuredArchivesChannelId()
  const record = await readRecord(discord, userId)
  const [options, history, ticketArchives] = await Promise.all([
    readSanctionOptions(discord, staffMember, record),
    readSanctionHistory(discord, record),
    readTicketArchives(discord, archivesChannelId, record),
  ])
  return (
    <RecordView
      record={record}
      options={options}
      history={history}
      ticketArchives={ticketArchives}
    />
  )
}
