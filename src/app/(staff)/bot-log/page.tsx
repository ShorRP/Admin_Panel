import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { BotLog } from "@/bot-log/bot-log"
import { BotLogSkeleton } from "@/bot-log/bot-log-skeleton"
import { configuredBotLog } from "@/bot-log/configured-bot-log"
import { readBotLogForStaff } from "@/bot-log/read-bot-log-for-staff"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { LogPage } from "@/ui/log-page"

export const metadata: Metadata = { title: "Journal du Bot" }

export default function BotLogPage({ searchParams }: PageProps<"/bot-log">) {
  return (
    <LogPage
      overline="Bot · Heures de Paris"
      title="Journal du Bot"
      description="Ce que le Bot fait de lui-même sur le serveur Discord : les rôles qu’il donne, les salons vocaux qu’il crée, les tickets qu’il ouvre et ferme. Filtre par famille, par compte ou par salon, ou limite le journal à une période."
      skeleton={<BotLogSkeleton />}
    >
      <BotLogFromDiscord searchParams={searchParams} />
    </LogPage>
  )
}

async function BotLogFromDiscord({
  searchParams,
}: Pick<PageProps<"/bot-log">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const read = await readBotLogForStaff(
    discord,
    staffMember,
    configuredBotLog(),
    await searchParams
  )
  if (read.kind === "hidden") {
    notFound()
  }
  return (
    <BotLog
      read={read}
      guildId={discord.guildId}
      opensModeration={staffMember.opensModeration}
    />
  )
}
