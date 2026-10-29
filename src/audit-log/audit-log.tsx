import Link from "next/link"
import { cn } from "cn"
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  ExternalLink,
  ShieldBan,
  Timer,
  TimerOff,
  Undo2,
  UserX,
} from "lucide-react"

import { SanctionChangeSummary } from "@/sanctions/sanction-change-summary"
import { buttonVariants } from "@/ui/button"
import { MemberAvatar } from "@/ui/member-avatar"
import { ParisTime } from "@/ui/paris-time"
import {
  CHANGE_BODY_CLASSES,
  CHANGE_ICON_TILE_CLASSES,
  CHANGE_ROW_CLASSES,
  CHANGE_STAFF_MEMBER_CLASSES,
  CHANGE_TIME_CLASSES,
  DAY_CHANGES_CLASSES,
  DAY_HEADER_CLASSES,
} from "./audit-log-layout"
import { ParisDay } from "./paris-day"
import type {
  AuditLogChange,
  AuditLogDay,
  AuditLogPage,
} from "./read-audit-log"

const CHANGE_ICONS = {
  word: { Icon: Ban, color: "text-muted-foreground" },
  rule: { Icon: ExternalLink, color: "text-muted-foreground" },
  timeout: { Icon: Timer, color: "text-warning" },
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
  const { days, before, older } = page
  const oldest = days.at(-1)?.changes.at(-1)
  return (
    <div className="flex flex-col gap-7">
      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input px-5 py-7 text-center text-muted-foreground">
          {before === null
            ? "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours."
            : "Aucun changement plus ancien."}
        </p>
      ) : (
        days.map((day) => (
          <ChangesOfDay
            key={day.date.toISOString()}
            day={day}
            opensModeration={opensModeration}
          />
        ))
      )}
      {(oldest !== undefined || before !== null || older !== null) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {oldest !== undefined && (
            <p className="text-xs text-muted-foreground">
              Jusqu’au <ParisDay date={oldest.date} dateStyle="medium" />
            </p>
          )}
          {(before !== null || older !== null) && (
            <nav
              aria-label="Pages du journal d’audit"
              className="ms-auto flex flex-wrap gap-2"
            >
              {before !== null && (
                <Link
                  href="/audit-log"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ArrowLeft aria-hidden data-icon="inline-start" />
                  Revenir aux plus récents
                </Link>
              )}
              {older !== null && (
                <Link
                  href={`/audit-log?before=${older}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ArrowRight aria-hidden data-icon="inline-start" />
                  Plus anciens
                </Link>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  )
}

function ChangesOfDay({
  day: { date, changes },
  opensModeration,
}: {
  day: AuditLogDay
  opensModeration: boolean
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className={DAY_HEADER_CLASSES}>
        <h2 className="font-heading text-lg leading-[1.2] font-medium">
          <ParisDay date={date} dateStyle="full" />
        </h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <ol className={DAY_CHANGES_CLASSES}>
        {changes.map((change) => (
          <ChangeRow
            key={change.id}
            change={change}
            opensModeration={opensModeration}
          />
        ))}
      </ol>
    </section>
  )
}

function ChangeRow({
  change,
  opensModeration,
}: {
  change: AuditLogChange
  opensModeration: boolean
}) {
  return (
    <li className={CHANGE_ROW_CLASSES}>
      <span
        className={cn(
          CHANGE_TIME_CLASSES,
          "font-mono text-xs text-muted-foreground"
        )}
      >
        <ParisTime date={change.date} timeOnly />
      </span>
      <ChangeIcon kind={iconKindOf(change)} />
      <div className={CHANGE_BODY_CLASSES}>
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
      </div>
      <div className={CHANGE_STAFF_MEMBER_CLASSES}>
        <MemberAvatar
          name={change.memberName}
          avatarUrl={change.avatarUrl}
          size="sm"
        />
        <p
          title={change.memberName}
          className="min-w-0 text-[0.8125rem] wrap-anywhere text-muted-foreground sm:truncate"
        >
          {change.memberName}
        </p>
      </div>
    </li>
  )
}

function iconKindOf(change: AuditLogChange): ChangeIconKind {
  if (change.kind === "rule") {
    return change.madeInDiscord ? "rule" : "word"
  }
  return change.sanctionChange.kind
}

function ChangeIcon({ kind }: { kind: ChangeIconKind }) {
  const { Icon, color } = CHANGE_ICONS[kind]
  return (
    <span aria-hidden className={cn(CHANGE_ICON_TILE_CLASSES, color)}>
      <Icon className="size-3.75" />
    </span>
  )
}

function SanctionChangeDescription({
  change: { sanctionChange, account, reason },
  opensModeration,
}: {
  change: Extract<AuditLogChange, { kind: "sanction-change" }>
  opensModeration: boolean
}) {
  return (
    <>
      <p className="font-medium text-pretty wrap-anywhere">
        <SanctionChangeSummary change={sanctionChange} />
      </p>
      <p className="text-[0.8125rem] text-pretty wrap-anywhere text-muted-foreground">
        Compte :{" "}
        {opensModeration ? (
          <Link
            href={`/records/${account.id}`}
            prefetch={false}
            className="text-foreground underline decoration-input underline-offset-3 hover:decoration-primary"
          >
            {account.name}
          </Link>
        ) : (
          account.name
        )}
        {reason === null ? " · Aucun motif" : ` · Motif : ${reason}`}
      </p>
    </>
  )
}
