import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi, type DiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import type { StaffMember } from "@/staff/staff-member"
import { OpenSupportTickets } from "@/support-tickets/open-support-tickets"
import { OpenSupportTicketsSkeleton } from "@/support-tickets/open-support-tickets-skeleton"
import { readOpenSupportTickets } from "@/support-tickets/read-open-support-tickets"
import { SupportTicketsSection } from "@/support-tickets/support-tickets-section"
import {
  configuredArchivesChannelId,
  configuredTicketCategoryId,
} from "@/ticket-archives/archives-channel"
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
  const staff = staffFromDiscord()
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="mx-auto flex max-w-270 flex-col gap-7">
        <PageHeader
          overline="Tickets · Heures de Paris"
          title="Tickets de support"
          className="max-w-160"
        >
          Les tickets encore ouverts que tu vois sur Discord, puis les archives
          des tickets fermés : leur type de demande, qui les a ouverts et
          fermés, quand, et pourquoi.
        </PageHeader>
        <OrnamentRule leadingLine />
        <SupportTicketsSection id="open-support-tickets" title="En cours">
          <SuspenseWithSkeleton skeleton={<OpenSupportTicketsSkeleton />}>
            <OpenSupportTicketsFromDiscord staff={staff} />
          </SuspenseWithSkeleton>
        </SupportTicketsSection>
        <SupportTicketsSection id="support-ticket-archives" title="Archives">
          <SuspenseWithSkeleton skeleton={<SupportTicketArchivesSkeleton />}>
            <SupportTicketArchivesFromDiscord
              staff={staff}
              searchParams={searchParams}
            />
          </SuspenseWithSkeleton>
        </SupportTicketsSection>
      </main>
    </ViewTransition>
  )
}

type Staff = Promise<{ discord: DiscordApi; staffMember: StaffMember }>

async function staffFromDiscord() {
  await connection()
  const discord = createDiscordApi()
  return { discord, staffMember: await requireStaffMember(discord) }
}

async function OpenSupportTicketsFromDiscord({ staff }: { staff: Staff }) {
  const { discord, staffMember } = await staff
  return (
    <OpenSupportTickets
      read={await readOpenSupportTickets(
        discord,
        staffMember,
        configuredTicketCategoryId()
      )}
      opensModeration={staffMember.opensModeration}
    />
  )
}

async function SupportTicketArchivesFromDiscord({
  staff,
  searchParams,
}: { staff: Staff } & Pick<PageProps<"/support-tickets">, "searchParams">) {
  const { discord, staffMember } = await staff
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
