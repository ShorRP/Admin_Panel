import type { ReactNode } from "react"
import { cn } from "cn"

import { OrnamentRule } from "@/ui/ornament-rule"
import { Overline } from "@/ui/overline"
import { PublicPageFrame } from "./public-page-frame"
import { ShorLogo } from "./shor-logo"

export const LOGIN_ACTION_CLASS = cn(
  "h-10 w-full gap-2 px-4 has-data-[icon=inline-start]:pl-3.5 sm:w-auto"
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
    <PublicPageFrame note="Réservé au staff de Shor">
      <main className="flex flex-1 items-center py-12">
        <div className="flex max-w-100 flex-col gap-5.5">
          <ShorLogo className="h-12 w-11" />
          <div className="flex flex-col gap-3">
            <Overline>Panel du staff · Skyrim Roleplay</Overline>
            <h1 className="font-heading text-[2.375rem] leading-[1.02] font-medium tracking-[-0.01em] sm:text-[2.875rem]">
              {title}
            </h1>
          </div>
          <p className="text-[0.9375rem] leading-5.75 text-pretty text-muted-foreground">
            {children}
          </p>
          <OrnamentRule leadingLine />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {actions}
          </div>
        </div>
      </main>
    </PublicPageFrame>
  )
}
