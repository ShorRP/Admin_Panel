import {
  Ban,
  ExternalLink,
  ShieldBan,
  Timer,
  TimerOff,
  Undo2,
  UserX,
} from "lucide-react"

import { recordHrefForModerator } from "@/records/record-href"
import { SanctionChangeSummary } from "@/sanctions/sanction-change-summary"
import { AccountLink } from "@/ui/account-link"
import { LogDay } from "@/ui/log-day"
import { LogEmpty } from "@/ui/log-empty"
import { LogFrame } from "@/ui/log-frame"
import { LogPagination } from "@/ui/log-pagination"
import { LogRow } from "@/ui/log-row"
import { MemberAvatar } from "@/ui/member-avatar"
import { TextLink } from "@/ui/text-link"
import { AuditLogFilterFold } from "./audit-log-filter-fold"
import { AuditLogFilterForm } from "./audit-log-filter-form"
import { hasFilter, NO_FILTER, type AuditLogFilters } from "./audit-log-filters"
import { auditLogHref } from "./audit-log-href"
import { CHANGE_AUTHOR_CLASSES } from "./audit-log-layout"
import { AuditLogTypeFilter } from "./audit-log-type-filter"
import type {
  AuditLogChange,
  AuditLogDay,
  AuditLogPage,
} from "./read-audit-log"

const CHANGE_ICONS = {
  word: { Icon: Ban, color: "text-muted-foreground" },
  rule: { Icon: ExternalLink, color: "text-muted-foreground" },
  timeout: { Icon: Timer, color: "text-warning" },
  "automatic-timeout": { Icon: Timer, color: "text-warning" },
  "timeout-lift": { Icon: TimerOff, color: "text-success" },
  kick: { Icon: UserX, color: "text-destructive" },
  ban: { Icon: ShieldBan, color: "text-destructive" },
  "ban-lift": { Icon: Undo2, color: "text-success" },
}

type ChangeIconKind = keyof typeof CHANGE_ICONS

export function AuditLog({
  page,
  opensModeration,
}: {
  page: AuditLogPage
  opensModeration: boolean
}) {
  const { type, author, account, days, before, older } = page
  const filters = { type, author, account }
  const oldest = days.at(-1)?.changes.at(-1)
  return (
    <LogFrame
      filters={
        <>
          <AuditLogTypeFilter filters={filters} />
          <AuditLogFilterForm key={JSON.stringify(filters)} filters={filters} />
          <AuditLogFilterFold filters={filters} />
        </>
      }
    >
      {days.length === 0 ? (
        <LogEmpty
          message={noChangeMessage(filters, before)}
          resetHref={hasFilter(filters) ? auditLogHref(NO_FILTER) : null}
        />
      ) : (
        days.map((day) => (
          <ChangesOfDay
            key={day.date.toISOString()}
            day={day}
            opensModeration={opensModeration}
          />
        ))
      )}
      <LogPagination
        label="Pages du journal d’audit"
        oldest={oldest?.date ?? null}
        newestHref={before === null ? null : auditLogHref(filters)}
        olderHref={
          older === null ? null : auditLogHref({ ...filters, before: older })
        }
      />
    </LogFrame>
  )
}

function noChangeMessage(
  { type, author, account }: AuditLogFilters,
  before: AuditLogPage["before"]
) {
  if (before !== null) {
    return "Aucun changement plus ancien."
  }
  if (author !== null || account !== null) {
    return "Aucun changement ne correspond à ces filtres ces 45 derniers jours."
  }
  return type === null
    ? "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours."
    : "Aucun changement de ce type ces 45 derniers jours."
}

function ChangesOfDay({
  day: { date, changes },
  opensModeration,
}: {
  day: AuditLogDay
  opensModeration: boolean
}) {
  return (
    <LogDay date={date}>
      {changes.map((change) => (
        <ChangeRow
          key={change.id}
          change={change}
          opensModeration={opensModeration}
        />
      ))}
    </LogDay>
  )
}

function ChangeRow({
  change,
  opensModeration,
}: {
  change: AuditLogChange
  opensModeration: boolean
}) {
  const { Icon, color } = CHANGE_ICONS[iconKindOf(change)]
  return (
    <LogRow
      date={change.date}
      Icon={Icon}
      tileClassName={color}
      trailing={
        <AccountLink
          href={recordHrefForModerator(change.memberId, opensModeration)}
          className={CHANGE_AUTHOR_CLASSES}
        >
          {change.kind !== "automatic-timeout" && (
            <MemberAvatar
              name={change.memberName}
              avatarUrl={change.avatarUrl}
              size="sm"
            />
          )}
          <p
            title={change.memberName}
            className="min-w-0 truncate text-[0.8125rem] text-muted-foreground group-hover/account-link:text-foreground group-hover/account-link:underline group-focus-visible/account-link:underline"
          >
            {change.memberName}
          </p>
        </AccountLink>
      }
    >
      {change.kind === "rule" ? (
        <p className="font-medium text-pretty wrap-anywhere">
          {change.description}
        </p>
      ) : (
        <SanctionChangeDescription
          change={change}
          opensModeration={opensModeration}
        />
      )}
    </LogRow>
  )
}

function iconKindOf(change: AuditLogChange): ChangeIconKind {
  switch (change.kind) {
    case "rule":
      return change.madeInDiscord ? "rule" : "word"
    case "automatic-timeout":
      return change.kind
    case "sanction-change":
      return change.sanctionChange.kind
  }
}

function SanctionChangeDescription({
  change,
  opensModeration,
}: {
  change: Exclude<AuditLogChange, { kind: "rule" }>
  opensModeration: boolean
}) {
  const { account } = change
  const accountHref = recordHrefForModerator(account.id, opensModeration)
  return (
    <>
      <p className="font-medium text-pretty wrap-anywhere">
        {change.kind === "automatic-timeout" ? (
          "Exclusion temporaire automatique"
        ) : (
          <SanctionChangeSummary change={change.sanctionChange} />
        )}
      </p>
      <p className="text-[0.8125rem] text-pretty wrap-anywhere text-muted-foreground">
        Compte :{" "}
        {accountHref === null ? (
          account.name
        ) : (
          <TextLink href={accountHref} inSentence>
            {account.name}
          </TextLink>
        )}
        {detailOf(change)}
      </p>
    </>
  )
}

function detailOf(change: Exclude<AuditLogChange, { kind: "rule" }>) {
  if (change.kind === "automatic-timeout") {
    return change.ruleName === null ? "" : ` · Règle : « ${change.ruleName} »`
  }
  return change.reason === null
    ? " · Aucun motif"
    : ` · Motif : ${change.reason}`
}
