import type { ReactNode } from "react"

import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"

export function LinkRuleView({
  switchCard,
  domains,
  roles,
  channels,
  action,
  alert,
  otherExceptions,
}: {
  switchCard: ReactNode
  domains: ReactNode
  roles: ReactNode
  channels: ReactNode
  action: ReactNode
  alert: ReactNode
  otherExceptions: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-270 flex-col gap-7">
      <PageHeader
        overline="AutoMod · règle du panel"
        title="Liens"
        className="max-w-155"
      >
        Les messages qui contiennent un lien sont bloqués par Discord avant
        d’être publiés, sauf les liens des domaines permis et ceux des membres
        et des salons exemptés.
      </PageHeader>
      <OrnamentRule leadingLine />
      <div className="@container">
        <div className="grid gap-x-8 gap-y-7 @min-[42.5rem]:grid-cols-[minmax(0,1fr)_minmax(15rem,17.5rem)]">
          <div className="flex min-w-0 flex-col gap-7">
            {switchCard}
            {domains}
          </div>
          <div className="flex min-w-0 flex-col gap-7 @min-[42.5rem]:sticky @min-[42.5rem]:top-6 @min-[42.5rem]:self-start">
            {roles}
            {channels}
            {action}
            {alert}
            {otherExceptions}
          </div>
        </div>
      </div>
    </div>
  )
}
