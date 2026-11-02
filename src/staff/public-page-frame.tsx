import type { ReactNode } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { ShorLogo } from "./shor-logo"
import { StatefulThemeToggle } from "./stateful-theme-toggle"

const FOOTER_LINK_CLASSES =
  "inline-flex items-center gap-1.25 transition-colors hover:text-foreground"

export function PublicPageFrame({
  privacyPolicyCurrent = false,
  children,
}: {
  privacyPolicyCurrent?: boolean
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-7 sm:px-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShorLogo className="h-6 w-5.5" />
          <span className="font-heading text-base leading-none font-medium tracking-[0.22em] uppercase">
            Shor
          </span>
        </div>
        <StatefulThemeToggle iconOnly />
      </div>
      {children}
      <footer className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <p>Réservé au staff de Shor</p>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            prefetch={false}
            aria-current={privacyPolicyCurrent ? "page" : undefined}
            className={FOOTER_LINK_CLASSES}
          >
            Confidentialité
          </Link>
          <a
            href="https://shor-rp.fr"
            target="_blank"
            rel="noopener noreferrer"
            className={FOOTER_LINK_CLASSES}
          >
            shor-rp.fr
            <ExternalLink aria-hidden className="size-3" />
          </a>
        </div>
      </footer>
    </div>
  )
}
