import Link from "next/link"
import { cn } from "cn"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import {
  LOG_PAGINATION_CLASSES,
  LOG_PAGINATION_LINK_CLASSES,
} from "@/ui/log-layout"
import { ParisDay } from "@/ui/paris-day"

const LINK_CLASSES = cn(
  buttonVariants({ variant: "outline" }),
  LOG_PAGINATION_LINK_CLASSES
)

export function LogPagination({
  label,
  oldest,
  newestHref,
  olderHref,
}: {
  label: string
  oldest: Date | null
  newestHref: string | null
  olderHref: string | null
}) {
  if (oldest === null && newestHref === null && olderHref === null) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      {oldest !== null && (
        <p className="text-xs text-muted-foreground">
          Jusqu’au <ParisDay date={oldest} dateStyle="medium" />
        </p>
      )}
      {(newestHref !== null || olderHref !== null) && (
        <nav aria-label={label} className={LOG_PAGINATION_CLASSES}>
          {newestHref !== null && (
            <Link href={newestHref} prefetch={false} className={LINK_CLASSES}>
              <ArrowLeft aria-hidden data-icon="inline-start" />
              Revenir aux plus récents
            </Link>
          )}
          {olderHref !== null && (
            <Link href={olderHref} prefetch={false} className={LINK_CLASSES}>
              <ArrowRight aria-hidden data-icon="inline-start" />
              Plus anciens
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
