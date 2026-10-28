import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { readRecord } from "@/records/read-record"
import { RecordDetails } from "@/records/record-details"
import { RecordDetailsSkeleton } from "@/records/record-details-skeleton"
import { readSanctionHistory } from "@/sanctions/read-sanction-history"
import { RecordSanctions } from "@/sanctions/record-sanctions"
import { SanctionHistory } from "@/sanctions/sanction-history"
import { readTimeoutOptions } from "@/sanctions/timeout-options"
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
      <main className="mx-auto flex max-w-xl flex-col gap-6 p-4">
        <h1 className="font-heading text-xl font-medium">Fiche</h1>
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
    readTimeoutOptions(discord, staffMember, record),
    readSanctionHistory(discord, record),
  ])
  return (
    <>
      <RecordDetails record={record} />
      <RecordSanctions options={options} />
      <SanctionHistory history={history} />
    </>
  )
}
