import { recordHref } from "@/records/record-href"
import { frenchNumber } from "@/ui/french-number"
import { ParisTime } from "@/ui/paris-time"
import { TextLink } from "@/ui/text-link"
import type { ReadTicketArchive, TicketArchives } from "./read-ticket-archives"
import { MAX_MESSAGES_READ } from "./ticket-archive"

const HEADING_ID = "ticket-archives"

export function TicketArchiveList({ archives }: { archives: TicketArchives }) {
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4.5">
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
          Aucun ticket de support archivé pour ce compte.
        </p>
      ) : (
        <ol className="flex flex-col divide-y rounded-xl border bg-card">
          {archives.archives.map((archive) => (
            <TicketArchiveItem key={archive.messageId} archive={archive} />
          ))}
        </ol>
      )}
      {archives.kind === "read" && !archives.complete && (
        <p className="text-xs text-muted-foreground">
          Seuls les {frenchNumber(MAX_MESSAGES_READ)} derniers messages du salon
          des archives ont été lus : les tickets plus anciens ne s’affichent
          pas.
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
    <li className="flex flex-col gap-0.75 px-5 py-3.5">
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
