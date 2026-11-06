import { CircleHelp, Gamepad2 } from "lucide-react"

import { MAX_SEARCHES, SEARCH_PAGE_SIZE } from "@/discord/message-search-limits"
import { discordMessageUrl } from "@/discord/message-url"
import { DiscordMessageLink } from "@/ui/discord-message-link"
import { cutEmptySentence, LogCutNote } from "@/ui/log-cut"
import { LogDay } from "@/ui/log-day"
import { LogDetail, LogRawFields, LogTitle } from "@/ui/log-detail"
import { LogEmpty } from "@/ui/log-empty"
import { LogFrame } from "@/ui/log-frame"
import { LogPagination } from "@/ui/log-pagination"
import { LogRow } from "@/ui/log-row"
import { categoryKeyOf, GAME_LOG_CATEGORIES } from "./game-log-categories"
import { GameLogCategoryFilter } from "./game-log-category-filter"
import { GameLogFilterFold } from "./game-log-filter-fold"
import { GameLogFilterForm } from "./game-log-filter-form"
import {
  filtersOfPage,
  hasFilter,
  NO_FILTERS,
  type GameLogFilters,
} from "./game-log-filters"
import { gameLogHref } from "./game-log-href"
import { GameLogNotConfigured } from "./game-log-not-configured"
import type {
  GameLogEntry,
  GameLogEvent,
  GameLogRawLine,
} from "./parse-game-log-message"
import type { GameLogPage } from "./read-game-log"
import type { GameLogRead } from "./read-game-log-for-staff"

const READ_MESSAGES = MAX_SEARCHES * SEARCH_PAGE_SIZE

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
  const { days, before, older, cut } = read
  const filters = filtersOfPage(read)
  const oldest = days.at(-1)?.entries.at(-1)
  return (
    <LogFrame
      filters={
        <>
          <GameLogCategoryFilter filters={filters} />
          <GameLogFilterForm key={JSON.stringify(filters)} filters={filters} />
          <GameLogFilterFold filters={filters} />
        </>
      }
    >
      {days.length === 0 ? (
        <LogEmpty
          message={noLineMessage({ before, cut, filters })}
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
      {cut && days.length > 0 && <LogCutNote readMessages={READ_MESSAGES} />}
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

function noLineMessage({
  before,
  cut,
  filters,
}: Pick<GameLogPage, "before" | "cut"> & { filters: GameLogFilters }) {
  if (cut) {
    return cutEmptySentence(READ_MESSAGES)
  }
  if (before !== null) {
    return "Aucune ligne plus ancienne."
  }
  return hasFilter(filters)
    ? "Aucune ligne du journal du jeu ne correspond à ces filtres."
    : "Aucune ligne dans le journal du jeu pour l’instant."
}

function iconOf(entry: GameLogEntry) {
  if (entry.kind === "raw") {
    return CircleHelp
  }
  const category = categoryKeyOf(entry.category)
  return category === null ? Gamepad2 : GAME_LOG_CATEGORIES[category].icon
}

function GameLogRow({
  entry,
  guildId,
}: {
  entry: GameLogEntry
  guildId: string
}) {
  return (
    <LogRow
      date={entry.date}
      Icon={iconOf(entry)}
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
