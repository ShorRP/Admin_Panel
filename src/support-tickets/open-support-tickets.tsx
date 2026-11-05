import type { ReactNode } from "react"
import { cn } from "cn"
import { ExternalLink } from "lucide-react"

import { recordHrefForModerator } from "@/records/record-href"
import { AccountLink } from "@/ui/account-link"
import { EmptyListFrame } from "@/ui/empty-list-frame"
import { frenchNumber } from "@/ui/french-number"
import { Overline } from "@/ui/overline"
import { ParisTime } from "@/ui/paris-time"
import { TEXT_LINK_CLASSES, TextLink } from "@/ui/text-link"
import {
  OPEN_SUPPORT_TICKET_CLASSES,
  OPEN_SUPPORT_TICKET_FACT_CLASSES,
  OPEN_SUPPORT_TICKET_FACTS_CLASSES,
  OPEN_SUPPORT_TICKET_HEADER_CLASSES,
  OPEN_SUPPORT_TICKET_LIST_CLASSES,
  OPEN_SUPPORT_TICKET_NAME_CLASSES,
  OPEN_SUPPORT_TICKET_NAMES_CLASSES,
  OPEN_SUPPORT_TICKETS_CLASSES,
} from "./open-support-tickets-layout"
import type {
  OpenSupportTicket,
  OpenSupportTickets as OpenSupportTicketsRead,
} from "./read-open-support-tickets"

const COUNT_ID = "open-support-tickets-count"

export function OpenSupportTickets({
  read,
  opensModeration,
}: {
  read: OpenSupportTicketsRead
  opensModeration: boolean
}) {
  if (read.kind === "unconfigured") {
    return (
      <EmptyListFrame>
        <p>
          La catégorie des tickets n’est pas configurée pour ce serveur Discord.
        </p>
      </EmptyListFrame>
    )
  }
  const { tickets } = read
  if (tickets.length === 0) {
    return (
      <EmptyListFrame>
        <p>Aucun ticket n’est en cours.</p>
      </EmptyListFrame>
    )
  }
  return (
    <div className={OPEN_SUPPORT_TICKETS_CLASSES}>
      <Overline id={COUNT_ID}>
        {frenchNumber(tickets.length)}{" "}
        {tickets.length > 1 ? "tickets" : "ticket"}
      </Overline>
      <ul
        aria-labelledby={COUNT_ID}
        className={OPEN_SUPPORT_TICKET_LIST_CLASSES}
      >
        {tickets.map((ticket) => (
          <OpenSupportTicketCard
            key={ticket.channelId}
            ticket={ticket}
            opensModeration={opensModeration}
          />
        ))}
      </ul>
    </div>
  )
}

function OpenSupportTicketCard({
  ticket: {
    url,
    requestKind,
    opener,
    openedAt,
    lastActivityAt,
    messageCount,
    moreMessages,
    repliers,
    lastMessage,
  },
  opensModeration,
}: {
  ticket: OpenSupportTicket
  opensModeration: boolean
}) {
  return (
    <li className={OPEN_SUPPORT_TICKET_CLASSES}>
      <div className={OPEN_SUPPORT_TICKET_HEADER_CLASSES}>
        <p className="font-medium wrap-anywhere">{requestKind}</p>
        <p className="text-xs whitespace-nowrap text-muted-foreground">
          {messageCount}
          {moreMessages ? "+" : ""} {messageCount > 1 ? "messages" : "message"}
        </p>
      </div>
      <div className={OPEN_SUPPORT_TICKET_FACTS_CLASSES}>
        <Fact label="Ouvert par">
          <Name person={opener} opensModeration={opensModeration} />
          <Moment date={openedAt} />
        </Fact>
        <Fact label="Dernière activité">
          <p className="text-sm font-medium">
            <ParisTime date={lastActivityAt} />
          </p>
        </Fact>
        <Fact label="Réponses du staff">
          {repliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune réponse du staff pour l’instant.
            </p>
          ) : (
            <div className={OPEN_SUPPORT_TICKET_NAMES_CLASSES}>
              {repliers.map((replier) => (
                <Name
                  key={replier.id}
                  person={replier}
                  opensModeration={opensModeration}
                />
              ))}
            </div>
          )}
        </Fact>
      </div>
      <Fact label="Dernier message">
        {lastMessage === null ? (
          <p className="text-sm text-muted-foreground">
            Aucun message pour l’instant.
          </p>
        ) : (
          <>
            <Name
              person={lastMessage.author}
              opensModeration={opensModeration && !lastMessage.byBot}
            />
            <p className="text-[0.84375rem] text-pretty wrap-anywhere">
              {lastMessage.text === "" ? (
                <span className="text-muted-foreground">
                  Message sans texte
                </span>
              ) : (
                lastMessage.text
              )}
            </p>
          </>
        )}
      </Fact>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          TEXT_LINK_CLASSES,
          "inline-flex w-fit items-center gap-1.5 text-sm touch:min-h-11"
        )}
      >
        Ouvrir dans Discord
        <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </li>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={OPEN_SUPPORT_TICKET_FACT_CLASSES}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Moment({ date }: { date: Date }) {
  return (
    <p className="text-[0.8125rem] text-muted-foreground">
      <ParisTime date={date} />
    </p>
  )
}

function Name({
  person,
  opensModeration,
}: {
  person: { id: string; name: string }
  opensModeration: boolean
}) {
  const href = recordHrefForModerator(person.id, opensModeration)
  return href === null ? (
    <AccountLink href={null} className={OPEN_SUPPORT_TICKET_NAME_CLASSES}>
      {person.name}
    </AccountLink>
  ) : (
    <TextLink href={href} className={OPEN_SUPPORT_TICKET_NAME_CLASSES}>
      {person.name}
    </TextLink>
  )
}
