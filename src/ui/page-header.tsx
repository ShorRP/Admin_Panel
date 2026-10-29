import type { ReactNode } from "react"
import { cn } from "cn"

import { Overline } from "@/ui/overline"
import { PageHeading } from "@/ui/page-heading"

export function PageHeader({
  overline,
  title,
  children,
  className,
}: {
  overline?: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {overline !== undefined && <Overline>{overline}</Overline>}
      <PageHeading>{title}</PageHeading>
      <p className="text-[0.9375rem] leading-5.5 text-pretty text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
