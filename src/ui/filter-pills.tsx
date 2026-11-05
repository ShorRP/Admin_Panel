import type { ReactNode } from "react"
import Link from "next/link"
import { cva } from "class-variance-authority"
import { cn } from "cn"

import {
  FILTER_PILL_LIST_CLASSES,
  FILTER_PILL_SIZE_CLASSES,
  FILTER_PILLS_CLASSES,
} from "@/ui/filter-layout"
import { TextLink } from "@/ui/text-link"

export type FilterPill = {
  label: string
  href: string
  current: boolean
  badge?: ReactNode
}

const pillVariants = cva(
  cn(
    FILTER_PILL_SIZE_CLASSES,
    "inline-flex items-center gap-1.5 border px-3.25 text-[0.8125rem] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
  ),
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

export function FilterPills({
  label,
  pills,
  resetHref,
}: {
  label: string
  pills: FilterPill[]
  resetHref: string | null
}) {
  return (
    <div className={FILTER_PILLS_CLASSES}>
      <nav aria-label={label}>
        <ul className={FILTER_PILL_LIST_CLASSES}>
          {pills.map(({ label: text, href, current, badge }) => (
            <li key={text}>
              <Link
                href={href}
                prefetch={false}
                aria-current={current ? "true" : undefined}
                className={pillVariants({ current })}
              >
                {text}
                {badge}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {resetHref !== null && (
        <TextLink href={resetHref} className="text-[0.8125rem]">
          Réinitialiser
        </TextLink>
      )}
    </div>
  )
}
