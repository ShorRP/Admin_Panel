import Link from "next/link"
import { cn } from "cn"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { TextLink } from "@/ui/text-link"
import type { AccountListFilters } from "./account-list-filters"
import { accountListHref } from "./account-list-href"
import { GAP, pageNumbersOf } from "./page-numbers"

const NUMBER_CLASSES = cn(
  "inline-flex min-h-6 min-w-6 items-center justify-center px-1 text-sm touch:min-h-11 touch:min-w-11"
)

const NAV_CLASSES = cn("flex items-center sm:flex-wrap sm:gap-x-2 sm:gap-y-3")

const ARROW_CLASSES = cn("w-11 shrink-0 px-0 sm:w-auto sm:pr-2.5 sm:pl-2")

const ARROW_SPACER_CLASSES = cn("size-11 shrink-0 sm:hidden")

const COMPACT_LIST_CLASSES = cn(
  "flex min-w-0 flex-1 items-center justify-center sm:hidden"
)

const FULL_LIST_CLASSES = cn(
  "hidden flex-auto flex-wrap items-center justify-center gap-0.5 sm:flex"
)

const COMPACT_GAP_CLASSES = cn(
  "flex w-0 justify-center text-sm text-muted-foreground"
)

const FULL_GAP_CLASSES = cn("px-1 text-sm text-muted-foreground")

export function AccountPagination({
  filters,
  page,
  pages,
}: {
  filters: AccountListFilters
  page: number
  pages: number
}) {
  if (pages <= 1) {
    return null
  }
  return (
    <nav aria-label="Pages des comptes" className={NAV_CLASSES}>
      {page > 1 ? (
        <Link
          href={accountListHref(filters, page - 1)}
          prefetch={false}
          className={cn(buttonVariants({ variant: "outline" }), ARROW_CLASSES)}
        >
          <ArrowLeft aria-hidden />
          <span className="sr-only sm:not-sr-only">Page précédente</span>
        </Link>
      ) : (
        <span aria-hidden className={ARROW_SPACER_CLASSES} />
      )}
      <PageNumbers
        filters={filters}
        page={page}
        entries={pageNumbersOf(page, pages, { compact: true })}
        listClassName={COMPACT_LIST_CLASSES}
        gapClassName={COMPACT_GAP_CLASSES}
      />
      <PageNumbers
        filters={filters}
        page={page}
        entries={pageNumbersOf(page, pages)}
        listClassName={FULL_LIST_CLASSES}
        gapClassName={FULL_GAP_CLASSES}
      />
      {page < pages ? (
        <Link
          href={accountListHref(filters, page + 1)}
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "outline" }),
            ARROW_CLASSES,
            "ms-auto"
          )}
        >
          <ArrowRight aria-hidden />
          <span className="sr-only sm:not-sr-only">Page suivante</span>
        </Link>
      ) : (
        <span aria-hidden className={ARROW_SPACER_CLASSES} />
      )}
    </nav>
  )
}

function PageNumbers({
  filters,
  page,
  entries,
  listClassName,
  gapClassName,
}: {
  filters: AccountListFilters
  page: number
  entries: ReturnType<typeof pageNumbersOf>
  listClassName: string
  gapClassName: string
}) {
  return (
    <ol className={listClassName}>
      {entries.map((entry, index) =>
        entry === GAP ? (
          <li key={`gap-${index}`} aria-hidden className={gapClassName}>
            <span className="shrink-0">{GAP}</span>
          </li>
        ) : (
          <li key={entry}>
            {entry === page ? (
              <span
                aria-current="page"
                className={cn(NUMBER_CLASSES, "font-semibold")}
              >
                <span className="sr-only">Page </span>
                {entry}
              </span>
            ) : (
              <TextLink
                href={accountListHref(filters, entry)}
                className={NUMBER_CLASSES}
              >
                <span className="sr-only">Page </span>
                {entry}
              </TextLink>
            )}
          </li>
        )
      )}
    </ol>
  )
}
