import type { ReactNode } from "react"
import { cn } from "cn"
import { ExternalLink } from "lucide-react"

import { OrnamentRule } from "@/ui/ornament-rule"
import { Overline } from "@/ui/overline"
import { ShorLogo } from "./shor-logo"
import { StatefulThemeToggle } from "./stateful-theme-toggle"

export const LOGIN_ACTION_CLASS = cn(
  "h-10 gap-2 px-4 has-data-[icon=inline-start]:pl-3.5"
)

export function LoginNotice({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions: ReactNode
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
      <main className="flex flex-1 items-center py-12">
        <div className="flex max-w-100 flex-col gap-5.5">
          <ShorLogo className="h-12 w-11" />
          <div className="flex flex-col gap-3">
            <Overline>Panel du staff · Skyrim Roleplay</Overline>
            <h1 className="font-heading text-[2.875rem] leading-[1.02] font-medium tracking-[-0.01em]">
              {title}
            </h1>
          </div>
          <p className="text-[0.9375rem] leading-5.75 text-pretty text-muted-foreground">
            {children}
          </p>
          <OrnamentRule leadingLine />
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      </main>
      <footer className="flex justify-between gap-4 text-xs text-muted-foreground">
        <p>Réservé au staff de Shor</p>
        <a
          href="https://shor-rp.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.25 transition-colors hover:text-foreground"
        >
          shor-rp.fr
          <ExternalLink aria-hidden className="size-3" />
        </a>
      </footer>
    </div>
  )
}
