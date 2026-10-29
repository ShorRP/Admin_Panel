import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { readRecord } from "@/records/read-record"
import { RecordBreadcrumb } from "@/records/record-breadcrumb"
import { RecordColumns } from "@/records/record-columns"
import { RecordDetails } from "@/records/record-details"
import { RecordDetailsSkeleton } from "@/records/record-details-skeleton"
import { RecordHeader } from "@/records/record-header"
import { readSanctionHistory } from "@/sanctions/read-sanction-history"
import { SanctionHistory } from "@/sanctions/sanction-history"
import { readSanctionOptions } from "@/sanctions/sanction-options"
import { StatefulRecordSanctions } from "@/sanctions/stateful-record-sanctions"
import { requireModerationAccess } from "@/staff/require-staff-member"
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
      <main className="flex flex-col gap-6">
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
  const record = await readRecord(discord, userId)
  const [options, history] = await Promise.all([
    readSanctionOptions(discord, staffMember, record),
    readSanctionHistory(discord, record),
  ])
  return (
    <>
      <RecordHeader record={record} />
      {record !== null && (
        <RecordColumns
          details={<RecordDetails record={record} />}
          sanctions={<StatefulRecordSanctions options={options} />}
          sanctionsShown={options.kind !== "none"}
          history={<SanctionHistory history={history} />}
        />
      )}
    </>
  )
}
