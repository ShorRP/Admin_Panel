import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { configuredGameLog } from "@/game-log/configured-game-log"
import { GameLog } from "@/game-log/game-log"
import { GameLogNotConfigured } from "@/game-log/game-log-not-configured"
import { GameLogSkeleton } from "@/game-log/game-log-skeleton"
import { readGameLog } from "@/game-log/read-game-log"
import {
  requireChannelAccess,
  requireStaffMember,
} from "@/staff/require-staff-member"
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
  const gameLog = configuredGameLog()
  if (gameLog === null) {
    await requireStaffMember(discord)
    return <GameLogNotConfigured />
  }
  await requireChannelAccess(discord, gameLog.channelId)
  return (
    <GameLog
      page={await readGameLog(discord, gameLog, await searchParams)}
      guildId={discord.guildId}
    />
  )
}
