import type { ReactNode } from "react"

import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"

export function ErrorNotice({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action: ReactNode
}) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5.5 px-4 py-12 sm:px-12">
      <PageHeader title={title}>{children}</PageHeader>
      <OrnamentRule leadingLine />
      <div className="flex flex-wrap gap-2">{action}</div>
    </main>
  )
}
