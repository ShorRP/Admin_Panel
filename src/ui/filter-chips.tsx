import Link from "next/link"
import { cn } from "cn"
import { X } from "lucide-react"

export type FilterChip = { name: string; value: string; href: string }

const CHIP_CLASSES = cn(
  "inline-flex h-7.5 max-w-full items-center gap-1.5 rounded-full border border-input pr-2.5 pl-3.25 text-[0.8125rem] font-medium text-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 touch:h-11"
)

export function FilterChips({
  chips,
  className,
}: {
  chips: FilterChip[]
  className?: string
}) {
  if (chips.length === 0) {
    return null
  }
  return (
    <ul
      aria-label="Filtres actifs"
      className={cn("flex min-w-0 flex-wrap gap-2", className)}
    >
      {chips.map(({ name, value, href }) => (
        <li key={name} className="max-w-full min-w-0">
          <Link
            href={href}
            prefetch={false}
            title={`${name} : ${value}`}
            className={CHIP_CLASSES}
          >
            <span className="sr-only">Retirer le filtre </span>
            <span className="min-w-0 truncate">
              {name} : {value}
            </span>
            <X aria-hidden className="size-3.5 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
