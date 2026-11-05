import { cn } from "cn"

import { recordHref } from "@/records/record-href"
import { frenchNumber } from "@/ui/french-number"
import { ParisTime } from "@/ui/paris-time"
import { TextLink } from "@/ui/text-link"
import {
  MAX_CITING_ARCHIVES_READ,
  type ReadTicketArchive,
  type TicketArchives,
} from "./read-ticket-archives"
import {
  TICKET_ARCHIVE_ENTRIES_CLASSES,
  TICKET_ARCHIVE_ENTRY_CLASSES,
  TICKET_ARCHIVES_CLASSES,
} from "./ticket-archive-layout"

const HEADING_ID = "ticket-archives"

export function TicketArchiveList({ archives }: { archives: TicketArchives }) {
  return (
    <section aria-labelledby={HEADING_ID} className={TICKET_ARCHIVES_CLASSES}>
      <h2
        id={HEADING_ID}
        className="font-heading text-2xl leading-[1.2] font-medium"
      >
        Tickets de support
      </h2>
      {archives.kind === "unconfigured" ? (
        <p className="text-muted-foreground">
          Le salon des archives n’est pas configuré pour ce serveur Discord.
        </p>
      ) : archives.archives.length === 0 ? (
        <p className="text-muted-foreground">
          {archives.complete
            ? "Aucun ticket de support archivé pour ce compte."
            : "Aucun ticket de support de ce compte parmi les archives lues."}
        </p>
      ) : (
        <ol className={TICKET_ARCHIVE_ENTRIES_CLASSES}>
          {archives.archives.map((archive) => (
            <TicketArchiveItem key={archive.messageId} archive={archive} />
          ))}
        </ol>
      )}
      {archives.kind === "read" && !archives.complete && (
        <p className="text-xs text-muted-foreground">
          Seules les {frenchNumber(MAX_CITING_ARCHIVES_READ)} archives les plus
          récentes où ce compte apparaît, qu’il les ait ouvertes ou fermées, ont
          été lues : ses tickets plus anciens ne s’affichent peut-être pas.
        </p>
      )}
    </section>
  )
}

function TicketArchiveItem({
  archive: { requestKind, openedAt, closedAt, closer, reason },
}: {
  archive: ReadTicketArchive
}) {
  return (
    <li className={cn(TICKET_ARCHIVE_ENTRY_CLASSES, "gap-0.75")}>
      <p className="font-medium wrap-anywhere">
        {requestKind ?? "Type de demande inconnu"}
      </p>
      <p className="text-[0.8125rem] wrap-anywhere text-muted-foreground">
        Ouvert le <ParisTime date={openedAt} />, fermé le{" "}
        <ParisTime date={closedAt} /> par{" "}
        <TextLink inSentence href={recordHref(closer.id)}>
          {closer.name ?? closer.id}
        </TextLink>
        .
      </p>
      <p className="mt-1 text-[0.84375rem] text-pretty wrap-anywhere">
        <span className="text-muted-foreground">Motif : </span>
        {reason}
      </p>
    </li>
  )
}
