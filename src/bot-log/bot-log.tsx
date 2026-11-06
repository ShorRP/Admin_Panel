import { Fragment } from "react"
import {
  BookOpenCheck,
  CircleHelp,
  Mic,
  Server,
  ShieldAlert,
  Ticket,
  type LucideIcon,
} from "lucide-react"

import { MAX_SEARCHES, SEARCH_PAGE_SIZE } from "@/discord/message-search-limits"
import { discordMessageUrl } from "@/discord/message-url"
import { recordHrefForModerator } from "@/records/record-href"
import { DiscordMessageLink } from "@/ui/discord-message-link"
import { frenchNumber } from "@/ui/french-number"
import { LogDay } from "@/ui/log-day"
import { LogDetail, LogRawFields, LogTitle } from "@/ui/log-detail"
import { LogEmpty } from "@/ui/log-empty"
import { LogFrame } from "@/ui/log-frame"
import { LogPagination } from "@/ui/log-pagination"
import { LogRow } from "@/ui/log-row"
import { TextLink } from "@/ui/text-link"
import { BOT_LOG_FAMILIES, type BotLogFamilyKey } from "./bot-log-families"
import { BotLogFamilyFilter } from "./bot-log-family-filter"
import { BotLogFilterFold } from "./bot-log-filter-fold"
import { BotLogFilterForm } from "./bot-log-filter-form"
import { hasFilter, NO_FILTERS, type BotLogFilters } from "./bot-log-filters"
import { botLogHref } from "./bot-log-href"
import { BotLogNotConfigured } from "./bot-log-not-configured"
import type {
  BotLogEntry,
  BotLogEvent,
  BotLogField,
  BotLogRawLine,
  BotLogReference,
} from "./parse-bot-log-message"
import type { BotLogNotice, BotLogPage } from "./read-bot-log"
import type { BotLogRead } from "./read-bot-log-for-staff"

const FAMILY_ICONS: Record<BotLogFamilyKey, LucideIcon> = {
  rules: BookOpenCheck,
  "voice-channels": Mic,
  tickets: Ticket,
  "game-servers": Server,
  "automatic-sanctions": ShieldAlert,
}

export function BotLog({
  read,
  guildId,
  opensModeration,
}: {
  read: Exclude<BotLogRead, { kind: "hidden" }>
  guildId: string
  opensModeration: boolean
}) {
  if (read.kind === "unconfigured") {
    return <BotLogNotConfigured />
  }
  const { days, before, older, cut, notice } = read
  const filters: BotLogFilters = {
    family: read.family,
    action: read.action,
    account: read.account,
    channel: read.channel,
    text: read.text,
    from: read.from,
    to: read.to,
  }
  const oldest = days.at(-1)?.entries.at(-1)
  return (
    <LogFrame
      filters={
        <>
          <BotLogFamilyFilter filters={filters} />
          <BotLogFilterForm key={JSON.stringify(filters)} filters={filters} />
          <BotLogFilterFold filters={filters} />
        </>
      }
    >
      {days.length === 0 ? (
        <LogEmpty
          message={noLineMessage({ notice, before, cut, filters })}
          resetHref={
            hasFilter(filters) || notice !== null
              ? botLogHref(NO_FILTERS)
              : null
          }
        />
      ) : (
        days.map((day) => (
          <LogDay key={day.date.toISOString()} date={day.date}>
            {day.entries.map((entry) => (
              <BotLogRow
                key={entry.messageId}
                entry={entry}
                guildId={guildId}
                opensModeration={opensModeration}
              />
            ))}
          </LogDay>
        ))
      )}
      {cut && days.length > 0 && (
        <p className="text-xs text-muted-foreground">{cutSentence()}</p>
      )}
      <LogPagination
        label="Pages du Journal du Bot"
        oldest={oldest?.date ?? null}
        newestHref={before === null ? null : botLogHref(filters)}
        olderHref={
          older === null ? null : botLogHref({ ...filters, before: older })
        }
      />
    </LogFrame>
  )
}

function readMessageCount() {
  return frenchNumber(MAX_SEARCHES * SEARCH_PAGE_SIZE)
}

function cutSentence() {
  return `Les ${readMessageCount()} messages suivants du salon ont été lus, ce qui ne remplit pas la page : « Plus anciens » continue la lecture.`
}

function noLineMessage({
  notice,
  before,
  cut,
  filters,
}: Pick<BotLogPage, "notice" | "before" | "cut"> & { filters: BotLogFilters }) {
  if (notice !== null) {
    return noticeSentence(notice)
  }
  if (cut) {
    return `Aucune ligne ne correspond aux filtres parmi les ${readMessageCount()} messages suivants du salon : « Plus anciens » continue la lecture.`
  }
  if (before !== null) {
    return "Aucune ligne plus ancienne."
  }
  return hasFilter(filters)
    ? "Aucune ligne du Journal du Bot ne correspond à ces filtres."
    : "Aucune ligne dans le Journal du Bot pour l’instant."
}

function noticeSentence({ filter, text, kind }: BotLogNotice) {
  if (filter === "account") {
    return kind === "none"
      ? `Aucun membre ni compte banni ne commence par « ${text} » (compte) : un compte parti du serveur se cherche par son ID ou sa mention.`
      : `Plusieurs comptes commencent par « ${text} » (compte) : précise le nom, ou colle l’ID ou la mention du compte.`
  }
  return kind === "none"
    ? `Aucun salon que tu vois ne contient « ${text} » (salon) : un salon supprimé se cherche par son ID ou sa mention.`
    : `Plusieurs salons contiennent « ${text} » (salon) : précise le nom, ou colle l’ID ou la mention du salon.`
}

function BotLogRow({
  entry,
  guildId,
  opensModeration,
}: {
  entry: BotLogEntry
  guildId: string
  opensModeration: boolean
}) {
  return (
    <LogRow
      date={entry.date}
      Icon={entry.kind === "event" ? FAMILY_ICONS[entry.family] : CircleHelp}
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
        <EventLines event={entry} opensModeration={opensModeration} />
      ) : (
        <RawLines line={entry} />
      )}
    </LogRow>
  )
}

function EventLines({
  event: { family, action, fields, extra },
  opensModeration,
}: {
  event: BotLogEvent
  opensModeration: boolean
}) {
  return (
    <>
      <LogTitle>
        {BOT_LOG_FAMILIES[family].label} · {action}
      </LogTitle>
      {fields.length > 0 && (
        <LogDetail>
          {fields.map((field, index) => (
            <Fragment key={index}>
              {index > 0 && " · "}
              <FieldText field={field} opensModeration={opensModeration} />
            </Fragment>
          ))}
        </LogDetail>
      )}
      <LogRawFields fields={extra} />
    </>
  )
}

function FieldText({
  field: { name, parts },
  opensModeration,
}: {
  field: BotLogField
  opensModeration: boolean
}) {
  return (
    <>
      {name} :{" "}
      {parts.map((part, index) =>
        part.kind === "text" ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <Reference
            key={index}
            reference={part}
            opensModeration={opensModeration}
          />
        )
      )}
    </>
  )
}

function Reference({
  reference: { kind, id, name },
  opensModeration,
}: {
  reference: BotLogReference
  opensModeration: boolean
}) {
  const label = kind === "channel" && name !== null ? `#${name}` : (name ?? id)
  const href =
    kind === "account" ? recordHrefForModerator(id, opensModeration) : null
  return href === null ? (
    <span title={id}>{label}</span>
  ) : (
    <TextLink href={href} inSentence title={id}>
      {label}
    </TextLink>
  )
}

function RawLines({ line: { title, fields } }: { line: BotLogRawLine }) {
  return (
    <>
      <LogTitle>{title ?? "Message sans titre"}</LogTitle>
      <LogRawFields fields={fields} />
    </>
  )
}
