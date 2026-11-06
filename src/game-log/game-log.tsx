import type { ReactNode } from "react"
import { cn } from "cn"
import {
  CircleHelp,
  ExternalLink,
  Gamepad2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import { LogDay } from "@/ui/log-day"
import { LogEmpty } from "@/ui/log-empty"
import { LogFrame } from "@/ui/log-frame"
import { LogPagination } from "@/ui/log-pagination"
import { LogRow } from "@/ui/log-row"
import { TEXT_LINK_CLASSES } from "@/ui/text-link"
import { GameLogFilterFold } from "./game-log-filter-fold"
import { GameLogFilterForm } from "./game-log-filter-form"
import { hasFilter, NO_FILTERS } from "./game-log-filters"
import { gameLogHref } from "./game-log-href"
import { GAME_LOG_TRAILING_CLASSES } from "./game-log-layout"
import type {
  GameLogEntry,
  GameLogEvent,
  GameLogRawLine,
} from "./parse-game-log-message"
import type { GameLogPage } from "./read-game-log"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  administration: ShieldCheck,
  personnages: UserRound,
}

const DETAIL_CLASSES = cn(
  "text-[0.8125rem] text-pretty wrap-anywhere text-muted-foreground"
)

export function GameLog({
  page,
  guildId,
}: {
  page: GameLogPage
  guildId: string
}) {
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
        <a
          href={`https://discord.com/channels/${guildId}/${entry.channelId}/${entry.messageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(TEXT_LINK_CLASSES, GAME_LOG_TRAILING_CLASSES)}
        >
          Voir dans Discord
          <ExternalLink aria-hidden className="size-3.5 shrink-0" />
        </a>
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
      <p className="font-medium text-pretty wrap-anywhere">
        {category} ·{" "}
        <span className="font-mono text-[0.8125rem]">{action}</span>
      </p>
      <Detail>{who.join(" · ")}</Detail>
      <Detail>{about.join(" · ")}</Detail>
      <Detail>{place === null ? "" : `Lieu : ${place}`}</Detail>
      <Detail>{eventId === null ? "" : `Identifiant : ${eventId}`}</Detail>
    </>
  )
}

function RawLines({ line: { title, fields } }: { line: GameLogRawLine }) {
  return (
    <>
      <p className="font-medium text-pretty wrap-anywhere">
        {title ?? "Message sans titre"}
      </p>
      {fields.map(({ name, value }, index) => (
        <Detail key={index}>
          {name === null ? value : `${name} : ${value}`}
        </Detail>
      ))}
    </>
  )
}

function Detail({ children }: { children: ReactNode }) {
  return children === "" ? null : <p className={DETAIL_CLASSES}>{children}</p>
}
