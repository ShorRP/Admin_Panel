import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { configuredGameLog } from "@/game-log/configured-game-log"
import { GameLog } from "@/game-log/game-log"
import { GameLogSkeleton } from "@/game-log/game-log-skeleton"
import { readGameLogForStaff } from "@/game-log/read-game-log-for-staff"
import { requireStaffMember } from "@/staff/require-staff-member"
import { LogPage } from "@/ui/log-page"

export const metadata: Metadata = { title: "Journal du jeu" }

export default function GameLogPage({ searchParams }: PageProps<"/game-log">) {
  return (
    <LogPage
      overline="Serveur de jeu · Heures de Paris"
      title="Journal du jeu"
      description="Ce que le serveur de jeu poste sur Discord : les commandes d’administration, les personnages et leurs comptes de jeu. Cherche un mot ou limite le journal à une période."
      skeleton={<GameLogSkeleton />}
    >
      <GameLogFromDiscord searchParams={searchParams} />
    </LogPage>
  )
}

async function GameLogFromDiscord({
  searchParams,
}: Pick<PageProps<"/game-log">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  const staffMember = await requireStaffMember(discord)
  const read = await readGameLogForStaff(
    discord,
    staffMember,
    configuredGameLog(),
    await searchParams
  )
  if (read.kind === "hidden") {
    notFound()
  }
  return <GameLog read={read} guildId={discord.guildId} />
}
