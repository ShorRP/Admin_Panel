import type { ReactNode } from "react"

import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
import { BlockedWordExceptions } from "./blocked-word-exceptions"

export function BlockedWordsView({
  capacity,
  form,
  list,
  otherRules,
}: {
  capacity: ReactNode
  form: ReactNode
  list: ReactNode
  otherRules: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-270 flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <PageHeader
          overline="AutoMod · règle du panel"
          title="Mots interdits"
          className="max-w-155"
        >
          Les messages qui contiennent l’un de ces mots ou expressions sont
          bloqués par Discord avant d’être publiés.
        </PageHeader>
        {capacity}
      </div>
      <OrnamentRule leadingLine />
      <div className="@container">
        <div className="grid gap-x-10 gap-y-7 @min-[48.75rem]:grid-cols-[minmax(28.75rem,1fr)_minmax(17.5rem,22.5rem)]">
          <div className="flex min-w-0 flex-col gap-7">
            {form}
            {list}
          </div>
          <div className="flex min-w-0 flex-col gap-7 @min-[48.75rem]:sticky @min-[48.75rem]:top-6 @min-[48.75rem]:self-start">
            <BlockedWordExceptions />
            {otherRules}
          </div>
        </div>
      </div>
    </div>
  )
}
