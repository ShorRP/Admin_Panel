import { Suspense } from "react"

import { recordHrefForModerator } from "@/records/record-href"
import { AccountLink } from "@/ui/account-link"
import { EmptyListFrame } from "@/ui/empty-list-frame"
import { frenchNumber } from "@/ui/french-number"
import { Overline } from "@/ui/overline"
import { Pagination } from "@/ui/pagination"
import { ParisTime } from "@/ui/paris-time"
import { TextLink } from "@/ui/text-link"
import {
  SUPPORT_TICKET_ARCHIVES_CLASSES,
  SUPPORT_TICKET_ARCHIVES_LAYOUT_CLASSES,
  SUPPORT_TICKET_ENTRY_CLASSES,
  SUPPORT_TICKET_EVENTS_CLASSES,
  SUPPORT_TICKET_NAME_CLASSES,
} from "./support-ticket-archives-layout"
import { TicketArchiveFilterFold } from "./ticket-archive-filter-fold"
import { TicketArchiveFilterForm } from "./ticket-archive-filter-form"
import { FILTERS_CLASSES } from "./ticket-archive-filter-layout"
import {
  hasFilter,
  NO_FILTERS,
  readsOldestFirst,
} from "./ticket-archive-filters"
import { TicketArchiveKindFilter } from "./ticket-archive-kind-filter"
import { TicketArchiveKindFilterWithCounts } from "./ticket-archive-kind-filter-with-counts"
import { TICKET_ARCHIVE_ENTRIES_CLASSES } from "./ticket-archive-layout"
import {
  MAX_ARCHIVES_READ,
  WINDOW_SIZE,
  type AccountNotice,
  type ArchivesPage,
  type KindCounts,
  type PagedTicketArchive,
  type TicketArchivePage,
} from "./ticket-archive-page"
import { ticketArchivesHref } from "./ticket-archives-href"

const COUNT_ID = "support-ticket-archives-count"

const FILTER_LABELS = { opener: "ouvreur", closer: "fermeur" } as const

export function SupportTicketArchives({
  read,
  counts,
  opensModeration,
}: {
  read: TicketArchivePage
  counts: Promise<KindCounts | null> | null
  opensModeration: boolean
}) {
  if (read.kind === "unconfigured") {
    return (
      <EmptyListFrame>
        <p>
          Le salon des archives n’est pas configuré pour ce serveur Discord.
        </p>
      </EmptyListFrame>
    )
  }
  const { filters, archives, page, pages } = read
  return (
    <div className={SUPPORT_TICKET_ARCHIVES_LAYOUT_CLASSES}>
      <div className={FILTERS_CLASSES}>
        <Suspense
          fallback={<TicketArchiveKindFilter filters={filters} counts={null} />}
        >
          {counts === null ? (
            <TicketArchiveKindFilter filters={filters} counts={null} />
          ) : (
            <TicketArchiveKindFilterWithCounts
              filters={filters}
              counts={counts}
            />
          )}
        </Suspense>
        <TicketArchiveFilterForm
          key={JSON.stringify(filters)}
          filters={filters}
        />
        <TicketArchiveFilterFold filters={filters} />
      </div>
      <div className={SUPPORT_TICKET_ARCHIVES_CLASSES}>
        {archives.length === 0 ? (
          <NoArchive read={read} />
        ) : (
          <>
            <Overline id={COUNT_ID}>{ranksOf(read)}</Overline>
            <ol
              aria-labelledby={COUNT_ID}
              className={TICKET_ARCHIVE_ENTRIES_CLASSES}
            >
              {archives.map((archive) => (
                <SupportTicketArchive
                  key={archive.messageId}
                  archive={archive}
                  opensModeration={opensModeration}
                />
              ))}
            </ol>
          </>
        )}
        <Pagination
          label="Pages des archives"
          hrefOf={(target) => ticketArchivesHref(filters, target)}
          page={page}
          pages={pages}
        />
        {!read.complete && (
          <p className="text-xs text-muted-foreground">{limitOf(read)}</p>
        )}
      </div>
    </div>
  )
}

function NoArchive({ read }: { read: ArchivesPage }) {
  const { filters, accountNotice } = read
  if (accountNotice !== null) {
    return (
      <EmptyListFrame>
        <p>{accountNoticeText(accountNotice)}</p>
        <ResetLink />
      </EmptyListFrame>
    )
  }
  if (hasFilter(filters)) {
    return (
      <EmptyListFrame>
        <p>Aucune archive ne correspond à ces filtres.</p>
        <ResetLink />
      </EmptyListFrame>
    )
  }
  return (
    <EmptyListFrame>
      <p>Aucune archive de ticket à afficher.</p>
    </EmptyListFrame>
  )
}

function ResetLink() {
  return (
    <div className="mt-3">
      <TextLink
        href={ticketArchivesHref(NO_FILTERS, 1)}
        className="text-[0.8125rem]"
      >
        Réinitialiser
      </TextLink>
    </div>
  )
}

function accountNoticeText({ filter, text, kind }: AccountNotice) {
  return kind === "none"
    ? `Aucun membre ni compte banni ne commence par « ${text} » (${FILTER_LABELS[filter]}) : un compte parti du serveur se cherche par son ID ou sa mention.`
    : `Plusieurs comptes commencent par « ${text} » (${FILTER_LABELS[filter]}) : précise le nom, ou colle l’ID ou la mention du compte.`
}

function limitOf({ filters, limit }: ArchivesPage) {
  const oldestFirst = readsOldestFirst(filters)
  const read = oldestFirst ? "anciennes" : "récentes"
  const left = oldestFirst ? "récentes" : "anciennes"
  if (limit === "window") {
    return `Seules les ${frenchNumber(WINDOW_SIZE)} archives les plus ${read} de cette recherche ont été lues : les plus ${left} ne s’affichent pas. Précise un filtre ou une période pour les atteindre.`
  }
  return `Discord ne permet de lire que les ${frenchNumber(MAX_ARCHIVES_READ)} archives les plus ${read}${hasFilter(filters) ? " de cette recherche" : ""} : les plus ${left} ne s’affichent pas.`
}

function ranksOf({ first, last, total }: ArchivesPage) {
  const ranks =
    first === last
      ? frenchNumber(first)
      : `${frenchNumber(first)}–${frenchNumber(last)}`
  return `${ranks} sur ${frenchNumber(total)}`
}

function SupportTicketArchive({
  archive: { requestKind, opener, closer, openedAt, closedAt, reason },
  opensModeration,
}: {
  archive: PagedTicketArchive
  opensModeration: boolean
}) {
  return (
    <li className={SUPPORT_TICKET_ENTRY_CLASSES}>
      <p className="font-medium wrap-anywhere">
        {requestKind ?? "Type de demande inconnu"}
      </p>
      <div className={SUPPORT_TICKET_EVENTS_CLASSES}>
        <ArchiveEvent
          label="Ouvert par"
          account={opener}
          moment={openedAt}
          opensModeration={opensModeration}
        />
        <ArchiveEvent
          label="Fermé par"
          account={closer}
          moment={closedAt}
          opensModeration={opensModeration}
        />
      </div>
      <p className="text-[0.84375rem] text-pretty wrap-anywhere">
        <span className="text-muted-foreground">Motif : </span>
        {reason}
      </p>
    </li>
  )
}

function ArchiveEvent({
  label,
  account,
  moment,
  opensModeration,
}: {
  label: string
  account: PagedTicketArchive["opener"]
  moment: Date
  opensModeration: boolean
}) {
  const href = recordHrefForModerator(account.id, opensModeration)
  return (
    <div className="flex min-w-0 flex-col">
      <p className="text-xs text-muted-foreground">{label}</p>
      {href === null ? (
        <AccountLink href={null} className={SUPPORT_TICKET_NAME_CLASSES}>
          {account.name ?? account.id}
        </AccountLink>
      ) : (
        <TextLink href={href} className={SUPPORT_TICKET_NAME_CLASSES}>
          {account.name ?? account.id}
        </TextLink>
      )}
      <p className="text-[0.8125rem] text-muted-foreground">
        <ParisTime date={moment} />
      </p>
    </div>
  )
}
