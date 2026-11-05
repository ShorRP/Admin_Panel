import { recordHrefForModerator } from "@/records/record-href"
import { AccountLink } from "@/ui/account-link"
import { EmptyListFrame } from "@/ui/empty-list-frame"
import { frenchNumber } from "@/ui/french-number"
import { Overline } from "@/ui/overline"
import { Pagination } from "@/ui/pagination"
import { ParisTime } from "@/ui/paris-time"
import { TextLink } from "@/ui/text-link"
import {
  MAX_ARCHIVES_READ,
  type ArchivesPage,
  type PagedTicketArchive,
  type TicketArchivePage,
} from "./read-ticket-archive-page"
import {
  SUPPORT_TICKET_ARCHIVES_CLASSES,
  SUPPORT_TICKET_ENTRY_CLASSES,
  SUPPORT_TICKET_EVENTS_CLASSES,
  SUPPORT_TICKET_NAME_CLASSES,
} from "./support-ticket-archives-layout"
import { TICKET_ARCHIVE_ENTRIES_CLASSES } from "./ticket-archive-layout"
import { ticketArchivesHref } from "./ticket-archives-href"

const COUNT_ID = "support-ticket-archives-count"

export function SupportTicketArchives({
  read,
  opensModeration,
}: {
  read: TicketArchivePage
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
  const { archives, page, pages, complete } = read
  return (
    <div className={SUPPORT_TICKET_ARCHIVES_CLASSES}>
      {archives.length === 0 ? (
        <EmptyListFrame>
          <p>Aucune archive de ticket à afficher.</p>
        </EmptyListFrame>
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
        hrefOf={ticketArchivesHref}
        page={page}
        pages={pages}
      />
      {!complete && (
        <p className="text-xs text-muted-foreground">
          Discord ne permet de lire que les {frenchNumber(MAX_ARCHIVES_READ)}{" "}
          archives les plus récentes : les plus anciennes ne s’affichent pas.
        </p>
      )}
    </div>
  )
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
