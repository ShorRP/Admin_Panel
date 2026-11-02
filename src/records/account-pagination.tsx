import Link from "next/link"
import { cn } from "cn"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { TextLink } from "@/ui/text-link"
import type { AccountListFilters } from "./account-list-filters"
import { accountListHref } from "./account-list-href"
import { GAP, pageNumbersOf } from "./page-numbers"

const NUMBER_CLASSES =
  "inline-flex min-h-6 min-w-6 items-center justify-center px-1 text-sm"

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
    <nav
      aria-label="Pages des comptes"
      className="flex flex-wrap items-center gap-x-2 gap-y-3"
    >
      {page > 1 && (
        <Link
          href={accountListHref(filters, page - 1)}
          prefetch={false}
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft aria-hidden data-icon="inline-start" />
          Page précédente
        </Link>
      )}
      <ol className="flex flex-auto flex-wrap items-center justify-center gap-0.5">
        {pageNumbersOf(page, pages).map((entry, index) =>
          entry === GAP ? (
            <li
              key={`gap-${index}`}
              aria-hidden
              className="px-1 text-sm text-muted-foreground"
            >
              {GAP}
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
      {page < pages && (
        <Link
          href={accountListHref(filters, page + 1)}
          prefetch={false}
          className={buttonVariants({
            variant: "outline",
            className: "ms-auto",
          })}
        >
          <ArrowRight aria-hidden data-icon="inline-start" />
          Page suivante
        </Link>
      )}
    </nav>
  )
}
