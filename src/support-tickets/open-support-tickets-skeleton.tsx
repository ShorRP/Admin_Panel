import { Skeleton } from "@/ui/skeleton"
import {
  OPEN_SUPPORT_TICKET_CLASSES,
  OPEN_SUPPORT_TICKET_FACT_CLASSES,
  OPEN_SUPPORT_TICKET_FACTS_CLASSES,
  OPEN_SUPPORT_TICKET_HEADER_CLASSES,
  OPEN_SUPPORT_TICKET_LIST_CLASSES,
  OPEN_SUPPORT_TICKETS_CLASSES,
} from "./open-support-tickets-layout"

export function OpenSupportTicketsSkeleton() {
  return (
    <div role="status" className={OPEN_SUPPORT_TICKETS_CLASSES}>
      <span className="sr-only">Chargement des tickets en cours…</span>
      <Skeleton className="h-3.5 w-20 motion-reduce:animate-none" />
      <div className={OPEN_SUPPORT_TICKET_LIST_CLASSES}>
        <Card />
        <Card />
      </div>
    </div>
  )
}

function Card() {
  return (
    <div className={OPEN_SUPPORT_TICKET_CLASSES}>
      <div className={OPEN_SUPPORT_TICKET_HEADER_CLASSES}>
        <Skeleton className="h-5 w-40 motion-reduce:animate-none" />
        <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
      </div>
      <div className={OPEN_SUPPORT_TICKET_FACTS_CLASSES}>
        <Fact />
        <Fact />
        <Fact />
      </div>
      <div className={OPEN_SUPPORT_TICKET_FACT_CLASSES}>
        <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
        <Skeleton className="mt-1.5 h-4 w-32 motion-reduce:animate-none touch:h-11" />
        <Skeleton className="mt-1.5 h-4 w-full motion-reduce:animate-none" />
      </div>
      <Skeleton className="h-4 w-36 motion-reduce:animate-none touch:h-11" />
    </div>
  )
}

function Fact() {
  return (
    <div className={OPEN_SUPPORT_TICKET_FACT_CLASSES}>
      <Skeleton className="h-3 w-16 motion-reduce:animate-none" />
      <Skeleton className="mt-1.5 h-4 w-32 motion-reduce:animate-none touch:h-11" />
    </div>
  )
}
