import Link from "next/link"
import { cva } from "class-variance-authority"

import { frenchNumber } from "@/ui/french-number"
import { TextLink } from "@/ui/text-link"
import {
  REQUEST_KIND_KEYS,
  REQUEST_KINDS,
  type RequestKindKey,
} from "./request-kinds"
import {
  KIND_FILTER_CLASSES,
  KIND_LINKS_CLASSES,
} from "./ticket-archive-filter-layout"
import {
  hasFilter,
  NO_FILTERS,
  type TicketArchiveFilters,
} from "./ticket-archive-filters"
import type { KindCounts } from "./ticket-archive-page"
import { ticketArchivesHref } from "./ticket-archives-href"

const KIND_LINKS: { key: RequestKindKey | null; label: string }[] = [
  { key: null, label: "Tout" },
  ...REQUEST_KIND_KEYS.map((key) => ({
    key,
    label: `${REQUEST_KINDS[key].emoji} ${REQUEST_KINDS[key].label}`,
  })),
]

const kindLinkVariants = cva(
  "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-3.25 text-[0.8125rem] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 touch:h-11",
  {
    variants: {
      current: {
        true: "border-primary bg-primary text-primary-foreground",
        false:
          "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
    },
  }
)

export function TicketArchiveKindFilter({
  filters,
  counts,
}: {
  filters: TicketArchiveFilters
  counts: KindCounts | null
}) {
  return (
    <div className={KIND_FILTER_CLASSES}>
      <nav aria-label="Filtrer par type de demande">
        <ul className={KIND_LINKS_CLASSES}>
          {KIND_LINKS.map(({ key, label }) => (
            <li key={label}>
              <Link
                href={ticketArchivesHref({ ...filters, kind: key }, 1)}
                prefetch={false}
                aria-current={key === filters.kind ? "true" : undefined}
                className={kindLinkVariants({ current: key === filters.kind })}
              >
                {label}
                {key !== null && counts !== null && (
                  <KindCount count={counts[key]} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {hasFilter(filters) && (
        <TextLink
          href={ticketArchivesHref(NO_FILTERS, 1)}
          className="text-[0.8125rem]"
        >
          Réinitialiser
        </TextLink>
      )}
    </div>
  )
}

function KindCount({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden className="font-mono text-[0.6875rem]">
        {frenchNumber(count)}
      </span>
      <span className="sr-only">
        {frenchNumber(count)} {count > 1 ? "archives" : "archive"}
      </span>
    </>
  )
}
