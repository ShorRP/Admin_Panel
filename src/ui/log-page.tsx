import { ViewTransition, type ReactNode } from "react"

import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export function LogPage({
  overline,
  title,
  description,
  skeleton,
  children,
}: {
  overline: string
  title: string
  description: ReactNode
  skeleton: ReactNode
  children: ReactNode
}) {
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="mx-auto flex max-w-270 flex-col gap-7">
        <PageHeader overline={overline} title={title} className="max-w-160">
          {description}
        </PageHeader>
        <OrnamentRule leadingLine />
        <SuspenseWithSkeleton skeleton={skeleton}>
          {children}
        </SuspenseWithSkeleton>
      </main>
    </ViewTransition>
  )
}
