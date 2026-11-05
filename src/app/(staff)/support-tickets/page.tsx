import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { configuredArchivesChannelId } from "@/ticket-archives/archives-channel"
import { readTicketArchivePage } from "@/ticket-archives/read-ticket-archive-page"
import { SupportTicketArchives } from "@/ticket-archives/support-ticket-archives"
import { SupportTicketArchivesSkeleton } from "@/ticket-archives/support-ticket-archives-skeleton"
import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Tickets de support" }

export default function SupportTicketsPage({
  searchParams,
}: PageProps<"/support-tickets">) {
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="mx-auto flex max-w-270 flex-col gap-7">
        <PageHeader
          overline="Archives · Heures de Paris"
          title="Tickets de support"
          className="max-w-160"
        >
          Les tickets de support fermés, du plus récent au plus ancien : leur
          type de demande, qui les a ouverts et fermés, quand, et pourquoi.
        </PageHeader>
        <OrnamentRule leadingLine />
        <SuspenseWithSkeleton skeleton={<SupportTicketArchivesSkeleton />}>
          <SupportTicketArchivesFromDiscord searchParams={searchParams} />
        </SuspenseWithSkeleton>
      </main>
    </ViewTransition>
  )
}

async function SupportTicketArchivesFromDiscord({
  searchParams,
}: Pick<PageProps<"/support-tickets">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const { page } = await searchParams
  return (
    <SupportTicketArchives
      read={await readTicketArchivePage(
        discord,
        configuredArchivesChannelId(),
        page
      )}
      opensModeration={staffMember.opensModeration}
    />
  )
}
