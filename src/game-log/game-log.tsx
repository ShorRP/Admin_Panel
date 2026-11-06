import {
  CircleHelp,
  Gamepad2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import { discordMessageUrl } from "@/discord/message-url"
import { DiscordMessageLink } from "@/ui/discord-message-link"
import { LogDay } from "@/ui/log-day"
import { LogDetail, LogRawFields, LogTitle } from "@/ui/log-detail"
import { LogEmpty } from "@/ui/log-empty"
import { LogFrame } from "@/ui/log-frame"
import { LogPagination } from "@/ui/log-pagination"
import { LogRow } from "@/ui/log-row"
import { GameLogFilterFold } from "./game-log-filter-fold"
import { GameLogFilterForm } from "./game-log-filter-form"
import { hasFilter, NO_FILTERS } from "./game-log-filters"
import { gameLogHref } from "./game-log-href"
import { GameLogNotConfigured } from "./game-log-not-configured"
import type {
  GameLogEntry,
  GameLogEvent,
  GameLogRawLine,
} from "./parse-game-log-message"
import type { GameLogPage } from "./read-game-log"
import type { GameLogRead } from "./read-game-log-for-staff"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  administration: ShieldCheck,
  personnages: UserRound,
}

export function GameLog({
  read,
  guildId,
}: {
  read: Exclude<GameLogRead, { kind: "hidden" }>
  guildId: string
}) {
  if (read.kind === "unconfigured") {
    return <GameLogNotConfigured />
  }
  const page = read
  const { days, before, older } = page
  const filters = { text: page.text, from: page.from, to: page.to }
  const oldest = days.at(-1)?.entries.at(-1)
  return (
    <LogFrame
      filters={
        <>
          <GameLogFilterForm key={JSON.stringify(filters)} filters={filters} />
          <GameLogFilterFold filters={filters} />
        </>
      }
    >
      {days.length === 0 ? (
        <LogEmpty
          message={noLineMessage(page)}
          resetHref={hasFilter(filters) ? gameLogHref(NO_FILTERS) : null}
        />
      ) : (
        days.map((day) => (
          <LogDay key={day.date.toISOString()} date={day.date}>
            {day.entries.map((entry) => (
              <GameLogRow
                key={entry.messageId}
                entry={entry}
                guildId={guildId}
              />
            ))}
          </LogDay>
        ))
      )}
      <LogPagination
        label="Pages du journal du jeu"
        oldest={oldest?.date ?? null}
        newestHref={before === null ? null : gameLogHref(filters)}
        olderHref={
          older === null ? null : gameLogHref({ ...filters, before: older })
        }
      />
    </LogFrame>
  )
}

function noLineMessage({ text, from, to, before }: GameLogPage) {
  if (before !== null) {
    return "Aucune ligne plus ancienne."
  }
  return hasFilter({ text, from, to })
    ? "Aucune ligne du journal du jeu ne correspond à ces filtres."
    : "Aucune ligne dans le journal du jeu pour l’instant."
}

function GameLogRow({
  entry,
  guildId,
}: {
  entry: GameLogEntry
  guildId: string
}) {
  const Icon =
    entry.kind === "event"
      ? (CATEGORY_ICONS[entry.category.toLowerCase()] ?? Gamepad2)
      : CircleHelp
  return (
    <LogRow
      date={entry.date}
      Icon={Icon}
      tileClassName="text-muted-foreground"
      trailing={
        <DiscordMessageLink
          href={discordMessageUrl({
            guildId,
            channelId: entry.channelId,
            messageId: entry.messageId,
          })}
        />
      }
    >
      {entry.kind === "event" ? (
        <EventLines event={entry} />
      ) : (
        <RawLines line={entry} />
      )}
    </LogRow>
  )
}

function EventLines({
  event: {
    category,
    action,
    character,
    gameAccount,
    target,
    reason,
    place,
    eventId,
    extra,
  },
}: {
  event: GameLogEvent
}) {
  const who = [
    character,
    gameAccount === null ? null : `compte ${gameAccount}`,
  ].filter((part) => part !== null)
  const about = [
    target === null ? null : `Cible : ${target}`,
    reason === null ? null : `Motif : ${reason}`,
  ].filter((part) => part !== null)
  return (
    <>
      <LogTitle>
        {category} ·{" "}
        <span className="font-mono text-[0.8125rem]">{action}</span>
      </LogTitle>
      <LogDetail>{who.join(" · ")}</LogDetail>
      <LogDetail>{about.join(" · ")}</LogDetail>
      <LogDetail>{place === null ? "" : `Lieu : ${place}`}</LogDetail>
      <LogDetail>
        {eventId === null ? "" : `Identifiant : ${eventId}`}
      </LogDetail>
      <LogRawFields fields={extra} />
    </>
  )
}

function RawLines({ line: { title, fields } }: { line: GameLogRawLine }) {
  return (
    <>
      <LogTitle>{title ?? "Message sans titre"}</LogTitle>
      <LogRawFields fields={fields} />
    </>
  )
}
