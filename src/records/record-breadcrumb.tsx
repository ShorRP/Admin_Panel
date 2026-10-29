import Link from "next/link"
import { ArrowLeft, ChevronRight } from "lucide-react"

export function RecordBreadcrumb() {
  return (
    <nav aria-label="Fil d’Ariane">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
        <li>
          <Link
            href="/records"
            prefetch={false}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Modération
          </Link>
        </li>
        <li className="flex items-center gap-1.5">
          <ChevronRight aria-hidden className="size-3.25" />
          <span aria-current="page" className="text-foreground">
            Fiche
          </span>
        </li>
      </ol>
    </nav>
  )
}
