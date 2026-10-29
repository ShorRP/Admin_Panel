import Link from "next/link"
import { cva } from "class-variance-authority"
import { cn } from "cn"

import { auditLogHref } from "./audit-log-href"
import {
  TEXT_LINK_CLASSES,
  TYPE_FILTER_CLASSES,
  TYPE_LINKS_CLASSES,
} from "./audit-log-layout"
import { CHANGE_TYPES, type ChangeType } from "./change-type"

const LABELS: Record<ChangeType, string> = {
  "blocked-words": "Mots interdits",
  timeouts: "Exclusions",
  kicks: "Expulsions",
  bans: "Bannissements",
}

const TYPE_LINKS = [
  { type: null, label: "Tout" },
  ...CHANGE_TYPES.map((type) => ({ type, label: LABELS[type] })),
]

const typeLinkVariants = cva(
  "inline-flex h-7.5 items-center rounded-full border px-3.25 text-[0.8125rem] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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

export function AuditLogTypeFilter({ type }: { type: ChangeType | null }) {
  return (
    <div className={TYPE_FILTER_CLASSES}>
      <nav aria-label="Filtrer par type">
        <ul className={TYPE_LINKS_CLASSES}>
          {TYPE_LINKS.map((link) => {
            const current = link.type === type
            return (
              <li key={link.label}>
                <Link
                  href={auditLogHref({ type: link.type })}
                  prefetch={false}
                  aria-current={current ? "true" : undefined}
                  className={typeLinkVariants({ current })}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {type !== null && <ResetLink />}
    </div>
  )
}

export function ResetLink() {
  return (
    <Link
      href={auditLogHref({ type: null })}
      prefetch={false}
      className={cn("text-[0.8125rem]", TEXT_LINK_CLASSES)}
    >
      Réinitialiser
    </Link>
  )
}
